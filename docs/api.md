# API Reference

All endpoints live under `/api`. Responses use a consistent envelope:

```json
{ "success": true, "message": "ok", "data": { ... } }
{ "success": false, "message": "reason", "data": null }
```

Every endpoint requires the `cnt_session` cookie (set by login). Authorization is checked server-side per endpoint (see [Security](security.md)).

## Authentication

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/login` | Rate-limited; sets `cnt_session` |
| POST | `/api/auth/logout` | Revokes session |
| POST | `/api/auth/forgot-password` | Creates a 1h reset token (dev: returns link in response) |
| POST | `/api/auth/reset-password` | Consumes token, resets password, revokes sessions |
| GET | `/api/auth/me` | Current user + notification summary |
| POST | `/api/profile/change-password` | Requires current password |

## Users & Departments

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/users` | List (paginated, searchable) / create |
| GET/PATCH/DELETE | `/api/users/[id]` | Profile detail / update / deactivate |
| GET/POST | `/api/departments` | List / create |
| GET/PATCH/DELETE | `/api/departments/[id]` | Detail + stats / update / delete |

## Workflows

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/workflows` | List / create with steps |
| GET/PATCH | `/api/workflows/[id]` | Detail (steps, usage) / update (steps replaced atomically, status transitions) |

## Requests

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/requests` | List (filters: status, type, department, q, mine) / create (starts workflow) |
| GET/PATCH | `/api/requests/[id]` | Detail (approvals, comments, SLA, escalations) / update (title, description, priority, cancel) |
| POST | `/api/requests/[id]/action` | `APPROVED|REJECTED|SEND_BACK|REQUEST_CHANGES|DELEGATED|ESCALATED` — authorization vs step assignee |
| GET/POST | `/api/requests/[id]/comments` | Thread |
| GET/POST | `/api/requests/[id]/attachments` | Upload (whitelisted MIME, ≤ 10 MB) |
| GET | `/api/attachments/[id]` | Authenticated download |

## Tasks

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/tasks` | List (kanban grouping or flat, filters) / create |
| GET/PATCH | `/api/tasks/[id]` | Detail / update; completing a task linked to a request advances the workflow |
| GET/POST | `/api/tasks/[id]/comments` | Thread |

## Notifications

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/notifications` | List (paginated) |
| GET | `/api/notifications/unread-count` | Count badge |
| POST | `/api/notifications/read-all` | Mark all read |
| PATCH | `/api/notifications/[id]` | Mark one read (via `[id]` route) |

## Analytics, Reports, Search, Audit

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/analytics/summary` | KPIs, trend, approval queue |
| GET | `/api/analytics` | Workflow/department performance, SLA breach rate |
| GET | `/api/reports?type=...` | CSV: `requests`, `employees`, `workflows`, `audit` |
| GET | `/api/search?q=` | Global search (requests, users, departments, workflows) |
| GET | `/api/audit-logs` | Paginated audit trail (audit.view) |

## System

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/system/sla-check` | Marks breached SLA snapshots, escalates overdue requests, notifies. Admin only. |
| GET | `/api/system/overview` | Org + entity counts |
| PATCH | `/api/system/org` | Update organization (SUPER_ADMIN) |
| GET | `/api/approvals` | Current user's pending/actioned approvals |

## Request Actions

`POST /api/requests/[id]/action` body:

```json
{
  "action": "APPROVED | REJECTED | SEND_BACK | REQUEST_CHANGES | DELEGATED | ESCALATED",
  "comment": "required for REJECTED / REQUEST_CHANGES / SEND_BACK and for steps with requiresComment",
  "delegateToId": "user id (DELEGATED only)"
}
```

Rules enforced server-side:

- Only the step's assignee (role/department/user), or an admin, may act.
- A step can only be actioned once (`requestId_stepId` unique).
- Rejection is forbidden when the step has `allowRejection = false`.
- `DELEGATED` reassigns `Request.assignedUserId` (next action still requires assignee match).

## Pagination

List endpoints accept `page` and `pageSize` (default 20, max 100) and return `{ page, pageSize, total }`.
