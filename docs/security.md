# Security Model

## Authentication

- Passwords are hashed with **bcrypt** (cost 10) — never stored or logged in plaintext.
- Login creates a **server-side session row** (token hash, IP, user agent, expiry) and sets an `httpOnly` cookie (`cnt_session`) containing a JWT signed with HS256 (`AUTH_SECRET`).
- Sessions are **revocable**: logout and password reset delete/invalidate the session rows; `destroySession` clears the cookie.
- Forgot-password issues a one-time reset token (SHA-256 hashed at rest, 1 hour expiry) consumed by the reset endpoint.
- Password change requires the current password.

## Rate Limiting

- Login is throttled via the `LoginAttempt` table: **5 failed attempts per 15-minute window** per email+IP. Lockouts surface a clear message and are logged.

## Authorization (RBAC)

- A static permission matrix in `lib/rbac.ts` maps roles to fine-grained permissions (`users.*`, `departments.*`, `workflows.*`, `requests.*`, `approvals.*`, `tasks.*`, `analytics.view`, `reports.export`, `audit.view`, `settings.manage`, `notifications.view`).
- Every API route runs `requireApiUser` or `requireApiPermission` **server-side** — client-side hiding is never the security boundary.
- Object-level rules are enforced per route:
  - Employees see only their own requests; managers see their team's; admins see all.
  - Request actions (approve/reject/escalate) require the **step assignee** (role / department / user), the dynamic request assignee, or an admin.
  - Task status changes require the task assignee or a manager.
  - Employee profiles: employees can view their own; managers view direct reports; admins view all.

## Data Protection

- Secrets live in `.env` (not committed; `.env.example` documents them): `DATABASE_URL`, `AUTH_SECRET`.
- Sessions use hashed tokens; JWT contains no secrets beyond the signed user id.
- All passwords are 8–128 characters with server-side length enforcement.
- Audit logs record `(actor, action, entity, IP, user-agent, details)` for every sensitive operation.

## File Uploads

- MIME whitelist: PDF, PNG, JPEG, GIF, WebP, DOCX, XLSX, TXT.
- Size limit: 10 MB.
- Files are stored under `uploads/` with randomized names — **never served from a static/`public` path** — and downloaded only through the authenticated endpoint `/api/attachments/[id]` (request/task visibility checks apply).

## Defense in Depth

1. Protected pages call `requireUser()` server-side (redirect to `/login`).
2. Every API route independently authenticates and authorizes.
3. Validation on both ends: client-side (react-hook-form + zod) and server-side (zod/manual checks).
4. Prisma parameterized queries prevent SQL injection; all user input is typed/validated.
5. `httpOnly` + `sameSite` cookies reduce XSS/CSRF surface; no inline scripts or third-party analytics.

## Recommended Production Additions

- Configure `AUTH_SECRET` (≥ 32 random bytes) and rotate it periodically.
- Terminate TLS at the reverse proxy; set `Secure` attribute on the session cookie.
- Schedule the SLA check cron and monitor `AuditLog` anomalies.
- Enforce per-user attachment quotas and scan uploads for malware.
- Consider DB-level encryption at rest and a managed backup strategy.
