# Architecture

Updated: 2026-05-11

This is the living implementation map for the repository. It records what exists today, what is scaffolded but inactive, and the technical blockers that affect the MVP.

## Runtime Shape

```text
Browser
  -> Next.js App Router pages and client components
  -> Next.js route handlers under apps/web/app/api
  -> Supabase Auth, PostgreSQL, and Storage

Greenhouse/Lever webhook push
  -> HMAC-verified route handler
  -> Redis discovery stream

Python workers
  -> discovery runner
  -> verification worker
  -> company identity worker
  -> duplicate/canonical job worker
  -> resume parser
  -> job/profile embedders
  -> alert evaluator
  -> audit cleanup
  -> health logger

PostgreSQL
  -> users, profiles, resumes, jobs, companies, locations
  -> saved jobs, applications, alerts, notifications
  -> embeddings, quick-prep cache, agent runs, audit events
```

## Repository Map

```text
apps/web/              Next.js frontend and API routes
apps/workers/          Python worker package and tests
apps/jarvis-job-globe/ Static prototype/reference app, not production
packages/database/     SQL migrations, seeds, validators, apply scripts
packages/shared-types/ TypeScript contracts and partial Python contracts
packages/config/       Environment templates only
infra/docker/          Docker Compose files and Dockerfiles
infra/load-tests/      Existing k6 jobs API script
infra/terraform/       Placeholder files only
docs/whole_project/    Product vision/source specification DOCX files
docs/md/               This architecture map only
docs/decisions/        Privacy framework only
```

## Web App

`apps/web` uses Next.js App Router, React, TypeScript, Zustand, Supabase clients, `ioredis` in webhook route handlers, and the OpenAI SDK in quick-prep route code.

Implemented pages:

- `/` - globe/job discovery experience.
- `/login` and `/register` - Supabase auth pages.
- `/onboarding` - onboarding profile and resume upload control.
- `/profile` - profile summary plus current raw resume view/delete.
- `/saved` - saved jobs.
- `/applications` - official-apply redirect history.
- `/alerts` - alert CRUD.
- `/privacy` - draft privacy notice, not legal-approved.

The current globe is a custom React/CSS renderer in `GlobeCanvas` and `FallbackMap`. Globe.GL, React Three Fiber, and deck.gl dependencies are not active in the runtime map experience.

## API Routes

| Route | Auth | Current behavior |
|---|---|---|
| `GET /api/jobs` | Optional | Globe/list/detail data from `jobs_canonical`; signed-in detail responses use onboarding preference scoring. |
| `GET /api/health` | No | Environment and Supabase health check. |
| `/api/auth/session`, `/api/auth/refresh`, `/api/auth/logout` | Mixed | Supabase session state, refresh, and logout. |
| `GET/POST /api/profile` | Yes | Load/upsert onboarding profile. |
| `GET/POST/DELETE /api/resume` | Yes | Upload raw resume to Storage, return signed URL, delete current raw object. |
| `GET/POST/DELETE /api/saved-jobs` | Yes | Saved jobs; anonymous fallback is client-side session storage. |
| `GET/POST/PATCH/DELETE /api/alerts` | Yes | Alert CRUD. |
| `GET/POST /api/applications` | Yes | List and record official-apply redirects. |
| `GET /api/quick-prep` | Optional | OpenAI quick-prep JSON cached in `quick_prep_cache`; UI is not wired to this route. |
| `GET/PATCH /api/notifications` | Yes | Notification feed and mark-read. |
| `GET/DELETE /api/account` | Yes | Data export and account deletion route exist; deletion has correctness defects. |
| `POST /api/webhooks/greenhouse`, `POST /api/webhooks/lever` | HMAC | Push event to Redis discovery stream. |

Protected routes use `resolveRequestUser()`.

## Worker Pipeline

Active worker entry point: `apps/workers/src/job_globe_workers/main.py`.

```text
Discovery runner
  -> Redis discovery stream
     -> Verification worker
        -> jobs_raw + Redis verification stream
           -> Company identity worker
              -> companies + Redis canonical stream
                 -> Duplicate/canonical upsert
                    -> resolve_location()
                    -> classify()
                    -> jobs_canonical

Resume parser
  -> resume_extractions rows
  -> Supabase Storage download
  -> text extraction
  -> OpenAI structured extraction
  -> parsed_text, parsed_profile, confidence

Embedding workers
  -> OpenAI text-embedding-3-small
  -> job_embeddings and profile_embeddings

Alert evaluator
  -> active alerts and new jobs
  -> alert_deliveries, notifications, optional Resend email

Audit cleanup
  -> audit_retention_policies
  -> audit_events.expires_at
  -> expired audit deletion
```

Important boundary: `event_bus/consumer.py` contains consumer-group, ack, pending reclaim, and DLQ helpers, but active worker loops currently call legacy `read_events()`/`XREAD`. Reliable consumer groups and DLQ behavior are scaffolded, not active.

## Database

Migration validation currently passes for:

- 16 migration files.
- 21 application tables.
- `pgvector` extension.
- GIN indexes.
- `resume_extractions.user_id` uniqueness.
- Alert deliveries, notifications, quick-prep cache.
- Audit retention policies and expiring audit events.

Known schema/code mismatches:

- `/api/account` refers to `job_applications`; the schema table is `applications`.
- Account deletion does not delete raw resume objects from Supabase Storage.
- Account deletion does not anonymize or remove the internal `users` row.

## Match Scoring

Current live match scoring is preference-based:

- `apps/web/lib/jobs/supabaseJobs.ts` calls `buildMatchBreakdown()`.
- `buildMatchBreakdown()` scores remote preference, location, job type, and role family from onboarding profile data.

Scaffolded but not live:

- `apps/web/lib/match/scorer.ts` has a `fetchEmbeddingScore()` helper.
- Worker embedders generate `job_embeddings` and `profile_embeddings`.
- `apps/workers/src/job_globe_workers/scoring/match_engine.py` has a richer seven-component scorer.

The live job detail path does not currently use stored embeddings or parsed resume data.

## Infrastructure

- `vercel.json` points Vercel to `apps/web`.
- `railway.json` targets `infra/docker/Dockerfile.workers`.
- Docker Compose files define Postgres, Redis, web, and workers.
- `.github/workflows/ci.yml` is stale and still expects older database counts.
- `.github/workflows/deploy-staging.yml` is a placeholder echo job.
- `infra/docker/Dockerfile.web` contains invalid Dockerfile syntax in one `COPY` line.
- `infra/terraform/` is placeholder-only.

## Critical Technical Blockers

| Area | Blocker |
|---|---|
| Web build | `openai` and `ioredis` are not installed from the lockfile, so typecheck fails. |
| Workers | Ruff and pytest fail; resume parser tests are the known test failures. |
| Resume parsing | Upload path format does not match parser download logic. |
| Privacy/account deletion | Deletion references the wrong table and does not remove raw resume objects or internal user records. |
| Redis reliability | Consumer-group/DLQ helpers are not wired into active loops. |
| Match quality | Embeddings and parsed resumes are not used in live user-facing scores. |
| Quick prep | API exists, but UI is not wired and prompt input is too broad for the privacy spec. |
| CI/deploy | CI database assertions, web Dockerfile, staging deploy, and Terraform are not production-ready. |
| Production readiness | Rate limiting, CSP/security headers, load baseline, accessibility pass, and legal privacy sign-off are missing. |
