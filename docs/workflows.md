# Workflow Engine

The engine in `lib/services/workflow-engine.ts` implements a deterministic state machine over workflow steps.

## Concepts

- **Workflow** — belongs to a `RequestType` (`LEAVE`, `EXPENSE`, `PURCHASE`, `IT_SERVICE`, `DOCUMENT_APPROVAL`). Multiple workflows may exist per type; only `ACTIVE` ones are used (latest updated wins).
- **Step** — an ordered node in the workflow with:
  - `stepType`: `APPROVAL` (explicit decision) | `PROCESSING` (back-office work) | `TASK` (auto-creates a task)
  - `assigneeType` + target: `ROLE` (a role, resolved to a user), `DEPARTMENT` (a department head/manager), `USER` (specific user, or the requester if null)
  - `slaHours` — allowed hours for the step (creates an `SlaSnapshot`)
  - `escalationHours` — extra hours after SLA breach before formal escalation
  - policies: `requiresComment`, `allowRejection`, `isFinal`

## Lifecycle

```
submit ──► startWorkflowInstance ──► first ACTIONABLE step
                                        │
        ┌───────────────────────────────┤ (actions via /api/requests/[id]/action)
        ▼                               ▼
  APPROVED ──► advanceRequest ──► next actionable step (or COMPLETED)
  REJECTED ──► status = REJECTED (request terminal)
  SEND_BACK / REQUEST_CHANGES ──► status = SUBMITTED, step = first step
  DELEGATED ──► reassign assignedUserId
  ESCALATED ──► status = ESCALATED + Escalation record
```

### Actionable steps

A step is *actionable* when it needs a human decision or has an owner:

- `APPROVAL` — always actionable.
- `TASK` — always actionable (creates a task on entry).
- `PROCESSING` — actionable only when it has an assignee (role/department/user). Pure "notify" steps are skipped automatically by `firstActionableStep`, so workflows like *Submit → Manager → Finance → Done* start directly at *Manager Approval*.

## Assignee resolution

`assignStepAssignee` resolves in order:

1. `USER` — the step's user, or the **requester** when unset (e.g. "employee confirmation").
2. `ROLE` — first active user with that role.
3. `DEPARTMENT` — first active manager/department head/finance/HR in the department.

The resolved user is stored on the request (`assignedUserId`), drives the approval authorization check, and receives a notification.

## Tasks

When a request enters a `TASK` step, the engine creates a `Task` (title = step name, assignee = resolved user, due date = SLA deadline, linked to `requestId` + `stepId`). Completing a linked task (`PATCH /api/tasks/[id]` → `COMPLETED`) writes an `Approval` row and calls `advanceRequest`, so the request continues automatically.

## SLA & Escalation

`POST /api/system/sla-check` performs a single sweep:

1. Finds in-flight requests with a `dueDate` in the past.
2. Marks their open `SlaSnapshot`s as `breached` and notifies approvers.
3. If the step's `escalationHours` window has also passed, escalates the request (`status = ESCALATED`, `Escalation` record, notification to the requester's manager).
4. Notifies owners of overdue tasks.

Run it hourly in production (cron). `resolveEscalation` clears escalations when a request is actioned again.

## Seeded workflows

| Trigger | Steps |
|---|---|
| LEAVE | Manager Approval → HR Approval (final) |
| EXPENSE | Manager Approval → Finance Approval (final) |
| PURCHASE | Manager Approval → Department Head Approval → Finance Approval (final) |
| IT_SERVICE | IT Dept Triage (dept-it) → IT Engineer Resolution (task) → Employee Confirmation (requester) |
| DOCUMENT_APPROVAL | Manager Approval → Legal Review (task) → Final Approval (final) |

## Edge cases handled

- Empty or fully-non-actionable workflows → request completes immediately.
- Steps already actioned → `409 Conflict` (unique `requestId_stepId`).
- Rejection disallowed by step policy → `403`.
- Dynamic assignees (requester-confirmation, department heads) resolved at step entry, not at workflow design time.
