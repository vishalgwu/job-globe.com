# API Module

## Module Name and Purpose

API: `apps/web/app/api`

The API layer is implemented as Next.js route handlers. It exposes job data, auth session helpers, profile persistence, resume storage, saved jobs, alerts, application history, and health checks.

## What Is Completed

- `/api/jobs` with global, country, city, jobs, and detail modes.
- `/api/health` with environment, jobs table, migration, auth, and storage checks.
- `/api/auth/session`, `/api/auth/logout`, and `/api/auth/refresh`.
- `/api/profile` for authenticated profile read/write.
- `/api/resume` for upload, signed URL read, and raw file delete.
- `/api/saved-jobs` for authenticated saved job sync.
- `/api/alerts` with create, list, pause/resume, and delete.
- `/api/applications` for application redirect history.

## What Is In Progress

- API documentation alignment. Some older docs had stale placeholder language.
- Production observability around route failures.
- Alert delivery outside CRUD.

## What Is Remaining

- Background or scheduled alert delivery.
- More integration tests against live/staged Supabase if needed.
- Contract cleanup for any response shapes still documented differently from code.

## How It Works

Public routes read from Supabase using server-side helpers. Protected routes call `resolveRequestUser()` to validate the Supabase session cookie and resolve the internal user row. Database work is done through Supabase client calls in the route handlers and supporting `lib` modules.

`/api/jobs` delegates query and transformation work to `lib/jobs/filters.ts` and `lib/jobs/supabaseJobs.ts`. Job detail can include a personalized match breakdown when a signed-in user has a profile.

## Key Files

- `apps/web/app/api/jobs/route.ts`
- `apps/web/app/api/health/route.ts`
- `apps/web/app/api/auth/*/route.ts`
- `apps/web/app/api/profile/route.ts`
- `apps/web/app/api/resume/route.ts`
- `apps/web/app/api/saved-jobs/route.ts`
- `apps/web/app/api/alerts/route.ts`
- `apps/web/app/api/applications/route.ts`
- `apps/web/lib/supabase/*`
- `apps/web/lib/jobs/*`
- `apps/web/lib/match/scorer.ts`

## Dependencies and Integrations

- Supabase Auth, Database, and Storage
- Shared TypeScript contracts from `@job-globe/shared-types`
- Next.js route handlers
- Environment variables from `.env.example` and Vercel/GitHub settings
