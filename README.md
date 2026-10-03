# TechNova Flow — Enterprise Workflow Management System

A production-grade workflow and request management platform for enterprises: configurable multi-step workflows, approvals, SLA tracking with escalations, task automation, role-based access control, notifications, audit logging, and analytics.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Turbopack)
- **UI**: Tailwind CSS v4, lucide-react icons, recharts (analytics)
- **Forms**: react-hook-form + zod
- **Database**: PostgreSQL 16 (Docker), Prisma ORM 7 (driver adapters)
- **Auth**: Session cookies (JWT via `jose` + server-side session table), bcrypt password hashing
- **Tests**: Vitest
- **Infra**: docker-compose for the database

## Getting Started

### 1. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL 16 on `localhost:5433` with the database `cnt_project` (credentials are in `.env`).

The host port is `5433` (container port `5432`) so it does not collide with other local Postgres containers. If port `5433` is taken, change the host side of the `ports:` mapping in `docker-compose.yml` **and** `DATABASE_URL` in `.env` to match — a mismatch makes the app silently connect to a different database instead of failing loudly.

### 2. Install dependencies and configure

```bash
npm install
copy .env.example .env   # adjust secrets if needed
```

### 3. Migrate and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

The seed creates one organization (TechNova Global Pvt. Ltd.), 8 departments, 36 users, 5 configured workflows, 25 sample requests, tasks, approvals, and audit history.

### 4. Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve production build
```

## Demo Accounts

All seeded accounts use the password `Password@123`.

| Email | Role | Purpose |
|---|---|---|
| `admin@technova.com` | SUPER_ADMIN | Full access, settings, audit logs |
| `hr@technova.com` | HR_ADMIN | Employees, departments, approvals |
| `eng.head@technova.com` | DEPARTMENT_HEAD | Department approvals |
| `suresh.reddy@technova.com` | MANAGER | Team approvals, tasks |
| `finance@technova.com` | FINANCE | Financial approvals, exports |
| `rahul.kumar@technova.com` | EMPLOYEE | Create/track requests |

## Features

- **Requests** — leave, expense, purchase, IT service, document approval; lifecycle from submission to completion; comments, attachments, cancellation.
- **Workflow Builder** — admin-configured step sequences (approval / processing / task), per-step assignee (role, department, user), SLA hours, escalation rules, comment/rejection policies.
- **Approvals** — approve, reject (reason required), send back, request changes, delegate, escalate. Any step conflict is detected (already actioned).
- **SLA & Escalation** — SLA snapshots per step, breach detection, overdue task alerts, formal escalation with stakeholder notification. Trigger via `POST /api/system/sla-check` (cron in production).
- **Tasks** — workflow steps generate tasks automatically; kanban + list views, comments, reassignment, completion advances the parent request.
- **Notifications** — in-app center with unread counts and read-all.
- **Analytics & Reports** — dashboard KPIs, department performance, workflow performance, SLA breach rate, CSV exports.
- **Audit Trail** — every action recorded (who, what, when, IP, user agent); global search across requests, employees, departments, workflows.
- **Security** — RBAC permission matrix, rate-limited login, session revocation, hashed tokens, file upload whitelist (PDF, images, office docs, ≤ 10 MB), server-side authorization on every endpoint.

## Commands

```bash
npm run dev          # development server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
npm run build        # production build
npx prisma migrate dev --name <name>   # schema change + migration
npx prisma db seed   # reseed data
npx prisma studio    # database GUI
```

## Documentation

- [Architecture](docs/architecture.md)
- [Database schema](docs/database.md)
- [API reference](docs/api.md)
- [Security model](docs/security.md)
- [Workflow engine](docs/workflows.md)

## Project Structure

```
app/                    # App Router pages + API route handlers
  (app)/                # Authenticated application pages (sidebar layout)
  (auth)/               # Login / forgot-password / reset-password
  api/                  # REST API endpoints
  generated/prisma/     # Prisma client (generated — do not edit)
components/             # React client components
lib/                    # Server utilities: db, auth, rbac, api, audit,
                        # notifications, utils, services/workflow-engine
prisma/                 # schema.prisma, migrations, seed
uploads/                # Uploaded attachments (never served statically)
docs/                   # Documentation
```
