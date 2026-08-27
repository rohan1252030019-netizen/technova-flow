<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TechNova Flow — project notes

Enterprise workflow management system (Next.js 16 App Router + Prisma 7 + PostgreSQL 16 in Docker).

## Commands (run from project root)

- Dev server: `npm run dev` (http://localhost:3000, log in `dev.log` if started via Start-Process)
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm test` (Vitest; pure-logic tests in `lib/__tests__/`)
- Production build: `npm run build`
- DB up: `docker compose up -d` (container `cnt_project_db`, db `cnt_project`)
- Migrate: `npx prisma migrate dev --name <name>` / apply: `npx prisma migrate deploy`
- Regenerate client: `npx prisma generate` (outputs to `app/generated/prisma`; restart dev server afterward — the running process caches the client)
- Seed: `npx prisma db seed`

## Gotchas

- Prisma 7: `url` is NOT in the schema datasource (lives in `prisma.config.ts`); the client requires the `@prisma/adapter-pg` driver adapter; import from `@/app/generated/prisma/client`, NOT `@prisma/client`.
- Next.js 16: route `params`/`searchParams` are async; `cookies()` is async; `middleware.ts` is `proxy.ts` (none used — pages rely on `requireUser()`).
- Import path alias: `@/*` maps to the project root.
- Lint rules `@typescript-eslint/no-explicit-any` and `react-hooks/set-state-in-effect` are set to warn (client components use loose types for API payloads).
- Uploads go to `./uploads` (never served statically; authenticated download only).
- Shell is Windows PowerShell: no `&&` chaining; use `if ($?) {}`; quote paths with spaces.
- Full docs: `README.md`, `docs/architecture.md`, `docs/database.md`, `docs/api.md`, `docs/security.md`, `docs/workflows.md`.
