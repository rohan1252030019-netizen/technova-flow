# Architecture

## Overview

TechNova Flow is a Next.js 16 App Router application using server-rendered pages with client-side interactive components. The server layer provides a REST API consumed by React client components; all authorization happens server-side.

```
Browser
  │  HTML (RSC) for shell + SEO pages
  │  fetch() JSON for interactive data
  ▼
Next.js 16 (App Router)
  ├─ app/(app)/*        authenticated pages (requireUser via layout)
  ├─ app/(auth)/*       unauthenticated pages (login, reset)
  └─ app/api/*          REST endpoints (requireApiPermission)
        │
        ├─ lib/auth.ts            session cookie (JWT + DB row), helpers
        ├─ lib/api.ts            JSON helpers, pagination, permission gate
        ├─ lib/audit.ts          audit-log writer
        ├─ lib/notifications.ts  in-app notification writer
        ├─ lib/services/workflow-engine.ts   state machine
        └─ lib/db.ts             Prisma client (pg driver adapter)
              │
              ▼
        PostgreSQL 16 (Docker, cnt_project_db)
```

## Server / Client Boundary

- `app/(app)/layout.tsx` calls `requireUser()` and redirects to `/login` when unauthenticated, so every page under it is protected.
- Page components are async server components that pre-validate auth/permissions and render a client component for interactivity.
- Client components fetch from `/api/*` and keep local state; mutations go through typed fetch helpers.

## Workflow State Machine

A request flows through steps of a workflow. The engine (`lib/services/workflow-engine.ts`) is the single source of truth:

- `startWorkflowInstance` — creates the request at the first *actionable* step (steps that are pure processing without an assignee are skipped).
- `advanceRequest` — moves the request to the next actionable step, resolves the assignee, creates an SLA snapshot, and auto-creates a Task for TASK steps.
- Actions (`APPROVED | REJECTED | SEND_BACK | REQUEST_CHANGES | DELEGATED | ESCALATED`) are recorded in the `Approval` table and only the configured assignee (or an admin) may act.

Step types:

| StepType | Meaning | Actionable by |
|---|---|---|
| `APPROVAL` | Requires an explicit approve/reject decision | Assignee of the step |
| `PROCESSING` | Back-office work (no approval semantics) | Assignee, if one is configured |
| `TASK` | Creates a task; completing it advances the request | Task assignee |

## Data Access

- All database access goes through Prisma with a PostgreSQL driver adapter (`@prisma/adapter-pg`).
- Long-lived singleton client in `lib/db.ts` (`globalThis` cache in dev).
- Multi-entity mutations (advance + approvals + notifications) run in `prisma.$transaction`.

## Analytics & Reporting

- `/api/analytics/summary` — dashboard KPIs.
- `/api/analytics` — workflow and department performance.
- `/api/reports?type=requests|employees|workflows|audit` — CSV downloads with filters.

## Deployment Notes

- Database connection settings live in `prisma.config.ts` and `.env` (the schema file carries no `url` — Prisma 7 style).
- The Prisma client is generated into `app/generated/prisma`; regenerate with `npx prisma generate` after schema changes.
- The dev server (Turbopack) hot-reloads code, but a Prisma client regeneration requires a dev-server restart.
- Schedule `POST /api/system/sla-check` on a cron (e.g. every hour) in production.
- Uploaded files are stored under `uploads/` and served only through the authenticated download endpoint.
