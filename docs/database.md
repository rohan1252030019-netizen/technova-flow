# Database Schema

PostgreSQL 16, managed with Prisma 7. The schema lives in `prisma/schema.prisma`; the client is generated to `app/generated/prisma`.

## Entity Map

| Model | Purpose |
|---|---|
| `Organization` | Company profile (name, description, timezone, currency) |
| `Department` | Org units; heads + members; used for department-scoped assignment |
| `User` | Employees; role, manager, department, avatar, status |
| `Session` | Server-side session rows (revocable) with token hash, IP, user agent |
| `PasswordResetToken` | One-time reset tokens (SHA-256 hash, 1h expiry) |
| `LoginAttempt` | Rate-limit record for login (5 failures / 15 min window) |
| `Role`, `Permission`, `RolePermission` | Optional DB-driven RBAC (the app ships with a static permission matrix in `lib/rbac.ts`) |
| `Workflow` | A request-type workflow (trigger enum, status) |
| `WorkflowStep` | Ordered step: type, assignee (role/department/user), SLA hours, escalation config, policies |
| `WorkflowCondition` | (Reserved) branch conditions on steps |
| `Request` | The core entity: type, title, status, priority, current step, assignee, SLA due date, amount, metadata JSON |
| `Approval` | Every action taken on a step (unique per request+step) |
| `SlaSnapshot` | Per-step SLA records: started/due, breach flag |
| `Escalation` | Escalation events with resolver tracking |
| `Task` | Work items (auto-created by TASK steps or manual); completion advances the linked request |
| `Comment` | Thread on requests and tasks |
| `Attachment` | Uploaded files (original name, MIME, size, storage path) |
| `Notification` | In-app notifications with read flag |
| `AuditLog` | Immutable action trail: actor, action, entity, IP, user agent, details JSON |
| `Project` | (Reserved) higher-level grouping |

## Key Relationships

```
User (manager) 1─* User
Department 1─* User            Department 1─* Workflow
Workflow 1─* WorkflowStep
WorkflowStep 1─* Approval       WorkflowStep ─* Request (currentStep)
Request 1─* Approval / SlaSnapshot / Escalation / Comment / Attachment / Notification(per user)
Task *─1 Request (nullable)     Task *─1 WorkflowStep (nullable)
```

## Enums

- `Role`: `SUPER_ADMIN | HR_ADMIN | MANAGER | DEPARTMENT_HEAD | FINANCE | EMPLOYEE`
- `RequestType`: `LEAVE | EXPENSE | PURCHASE | IT_SERVICE | DOCUMENT_APPROVAL | CUSTOM`
- `RequestStatus`: `DRAFT | SUBMITTED | UNDER_REVIEW | PENDING_APPROVAL | IN_PROGRESS | ESCALATED | APPROVED | REJECTED | COMPLETED | CANCELLED`
- `StepType`: `APPROVAL | PROCESSING | TASK`
- `AssigneeType`: `ROLE | DEPARTMENT | USER`
- `TaskStatus`: `TODO | IN_PROGRESS | BLOCKED | COMPLETED | CANCELLED`
- `TaskPriority`: `LOW | MEDIUM | HIGH | URGENT`
- `RequestPriority`: `LOW | MEDIUM | HIGH | URGENT`
- `ApprovalAction`: `APPROVED | REJECTED | SEND_BACK | REQUEST_CHANGES | DELEGATED | ESCALATED`
- `WorkflowStatus`: `DRAFT | ACTIVE | ARCHIVED`
- `NotificationType`: `APPROVAL_REQUIRED | REQUEST_UPDATED | TASK_ASSIGNED | TASK_COMPLETED | ESCALATION | SLA_BREACH | WORKFLOW_COMPLETED | REQUEST_REJECTED | REQUEST_RETURNED | NEW_REQUEST | PASSWORD_RESET`

## Migrations

All applied migrations live in `prisma/migrations/`:

| Migration | Purpose |
|---|---|
| `20260817121330_init` | Full initial schema + indexes |
| `20260817130119_task_step_link` | Added `Task.stepId` → `WorkflowStep` |

## Conventions

- IDs are CUID strings (except seeded entities using human-readable slugs like `dept-eng`, `u-admin`).
- Money is `Decimal(12,2)` with a `currency` column.
- Requests carry `metadata Json?` for type-specific fields (leave days, expense category, etc.).
- Soft deletes: users/departments use `status`/`isActive` instead of hard deletion.
