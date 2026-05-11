# Architecture

Updated: 2026-05-11

This document describes the architecture that exists in the repository today. It distinguishes active runtime behavior from scaffolded helpers and planned MVP architecture in `docs/whole_project`.

## Current Runtime Shape

```text
Browser
  -> Next.js App Router pages and client components
  -> Next.js route handlers under apps/web/app/api
  -> Supabase Auth, PostgreSQL, and Storage

Greenhouse/Lever webhook push
  -> POST /api/webhooks/greenhouse or /api/webhooks/lever
  -> HMAC verification
  -> Redis discovery stream via ioredis

Python workers started from apps/workers/src/job_globe_workers/main.py
  -> discovery runner       : polls configured connectors -> Redis discovery stream
  -> verification worker    : legacy XREAD discovery stream -> jobs_raw -> verification stream
  -> company_identity       : legacy XREAD verification stream -> companies -> canonical stream
  -> duplicate_detection    : legacy XREAD canonical stream -> geo/taxonomy -> jobs_canonical
  -> resume_parser          : polls resume_extractions rows -> Storage download -> OpenAI parse
  -> job_embedder           : polls jobs_canonical -> OpenAI embeddings -> job_embeddings
  -> profile_embedder       : polls profiles -> OpenAI embeddings -> profile_embeddings
  -> alert_evaluator        : polls alerts/new jobs -> alert_deliveries + notifications + optional email
  -> audit_cleanup          : audit retention policies -> expires_at stamps -> deletes expired rows
  -> health                 : periodic structured health log

PostgreSQL (21 application tables)
  -> users, auth_sessions, profiles, resume_extractions
  -> companies, locations
  -> jobs_raw, jobs_canonical, job_taxonomy, job_taxonomy_links
  -> job_embeddings, profile_embeddings
  -> saved_jobs, applications
  -> alerts, alert_deliveries, notifications
  -> quick_prep_cache
  -> agent_runs, audit_events, audit_retention_policies
```

## Repository Shape

```text
apps/
  web/                 Next.js frontend and API routes
  workers/             Python worker package and tests
  jarvis-job-globe/    Static prototype/reference app, not production
packages/
  database/            SQL migrations, seeds, validation/application scripts
  shared-types/        TypeScript contracts and partial Python contracts
  config/              Environment templates
infra/
  docker/              Local + production Docker Compose files and Dockerfiles
  scripts/             Migration, seed, Railway deploy, and migration-seed scripts
  terraform/           Placeholder files only
  load-tests/          k6 load-test script
docs/
  md/                  Maintained status, architecture, handoff, gap, and infra docs
  decisions/           ADRs and privacy framework
  qa/                  QA evidence and artifacts
  whole_project/       Reference DOCX product plan/spec
.github/
  workflows/           CI plus staging deploy placeholder
```

## Web App

`apps/web` uses Next.js App Router, React, TypeScript, Zustand, Supabase clients, ioredis in webhook route handlers, and the OpenAI SDK in quick-prep route code.

Implemented pages:

- `/` - globe experience with `IntroOverlay`
- `/login`, `/register` - Supabase auth pages
- `/onboarding` - eight-step profile setup and resume upload control
- `/profile` - profile summary plus raw resume view/delete
- `/saved` - saved jobs page
- `/applications` - application redirect history
- `/alerts` - alert CRUD page
- `/privacy` - draft privacy notice; not legal-approved

The main globe is a custom React/CSS renderer in `GlobeCanvas` and `FallbackMap`. It is not currently Globe.GL, React Three Fiber, or deck.gl, even though those dependencies are listed.

## API Layer

Route modules live under `apps/web/app/api`. Protected routes call `resolveRequestUser()`.

| Method | Route | Auth | Current behavior |
|---|---|---|---|
| GET | `/api/jobs` | Optional | Globe/list/detail data from `jobs_canonical`; detail uses onboarding preference scoring when signed in. |
| GET | `/api/health` | No | Environment/Supabase health check. |
| GET | `/api/auth/session` | No | Current session state. |
| POST | `/api/auth/refresh` | No | Refresh Supabase token/session. |
| POST | `/api/auth/logout` | No | Clear session. |
| GET/POST | `/api/profile` | Yes | Load/upsert onboarding profile. |
| GET/POST/DELETE | `/api/resume` | Yes | Upload raw resume to Storage, return signed URL, delete raw object. |
| GET/POST/DELETE | `/api/saved-jobs` | Yes | Saved jobs. Anonymous fallback is handled client-side via session storage. |
| GET/POST/PATCH/DELETE | `/api/alerts` | Yes | Alert CRUD. UI creates in-app alerts by default. |
| GET/POST | `/api/applications` | Yes | List and record official-apply redirects. |
| GET | `/api/quick-prep` | Optional | OpenAI quick-prep JSON cached in `quick_prep_cache`; UI is not wired to this route. |
| GET/PATCH | `/api/notifications` | Yes | In-app notification feed and mark-read. |
| GET/DELETE | `/api/account` | Yes | Data export and account deletion route exist, but deletion has correctness defects. |
| POST | `/api/webhooks/greenhouse` | HMAC | Greenhouse push event to Redis discovery stream. |
| POST | `/api/webhooks/lever` | HMAC | Lever push event to Redis discovery stream. |

## Worker Workflow

Active worker loops are launched from `main.py`. Discovery, verification, company identity, and duplicate detection form the job ingestion path. Geo mapping and taxonomy tagging are not independent long-running agents; they are called inside duplicate/canonical processing.

```text
Discovery runner
  -> Redis discovery stream
     -> Verification worker
        -> jobs_raw + Redis verification stream
           -> Company identity worker
              -> companies + Redis canonical stream
                 -> Duplicate detection / canonical upsert
                    -> resolve_location()
                    -> classify() / write_taxonomy_links()
                    -> jobs_canonical

Resume parser worker
  -> resume_extractions rows with raw_object_key and parsed_text IS NULL
  -> Supabase Storage download
  -> PyMuPDF / unstructured extraction
  -> OpenAI structured extraction
  -> parsed_text, parsed_profile, confidence

Job/profile embedders
  -> OpenAI text-embedding-3-small
  -> job_embeddings / profile_embeddings

Alert evaluator
  -> active alerts and new jobs
  -> alert_deliveries + notifications
  -> optional Resend email path

Audit cleanup
  -> audit_retention_policies
  -> audit_events.expires_at
  -> delete expired rows
```

Important correction: `event_bus/consumer.py` contains consumer-group, ack, pending reclaim, and DLQ helpers, but active worker loops currently call the legacy `read_events()` helper. Reliable consumer groups, retry, and DLQ handling are scaffolded, not wired.

## Match Scoring

Current match scoring is split across two implementations:

- Web live path: `apps/web/lib/jobs/supabaseJobs.ts` calls `buildMatchBreakdown()` with a profile snapshot from onboarding answers. This currently uses a 4-signal rule scorer: remote preference, location, job type, and role family.
- Worker utility path: `apps/workers/src/job_globe_workers/scoring/match_engine.py` implements a 7-component 0-100 scorer with skills, seniority, location, remote, employment type, role family, and salary.

`apps/web/lib/match/scorer.ts` has a `fetchEmbeddingScore()` helper and `buildMatchBreakdown()` can blend an embedding score, but the live job-detail path does not call `fetchEmbeddingScore()`. Embeddings are generated by workers but are not part of live user-facing match scores yet.

## Database

Migration validation currently passes for:

- 16 migration files.
- 21 application tables.
- `pgvector` extension.
- GIN indexes.
- `resume_extractions.user_id` uniqueness.
- `alert_deliveries`, `notifications`, `quick_prep_cache`.
- `audit_retention_policies` and `audit_events.expires_at`.

Known schema/code mismatches:

- `/api/account` refers to `job_applications`, but the schema table is `applications`.
- Account deletion does not delete raw resume objects from Supabase Storage.
- Account deletion does not anonymize or remove the internal `users` row.

## Infrastructure

- `vercel.json` points Vercel to `apps/web`.
- `railway.json` targets `infra/docker/Dockerfile.workers`.
- `docker-compose.dev.yml` and `docker-compose.prod.yml` define Postgres, Redis, web, and workers.
- `.github/workflows/ci.yml` is stale: database assertions still expect 13 migrations and 17 tables.
- `.github/workflows/deploy-staging.yml` is a placeholder echo job.
- `infra/docker/Dockerfile.web` has invalid Dockerfile syntax in one `COPY` line and should not be treated as proven buildable.
- `infra/terraform/` is placeholder-only.

## Current Verification

Verified on 2026-05-11:

- ✅ Web tests pass: 5 files, 48 tests.
- ✅ Migration validation passes: 16 files, 21 tables.
- ✅ Worker mypy passes: 56 source files.
- ❌ Web typecheck fails: missing `openai` and `ioredis` from lockfile/installed dependencies.
- ❌ Worker ruff fails on alert/email/audit/profile/resume test lint issues.
- ❌ Worker pytest fails: 98 passed, 5 failed in resume parser tests.

## In Progress / Missing

- Package lockfile and dependency install consistency.
- Valid web Docker build.
- CI database assertions for current migration count.
- Resume parser storage key fix.
- Parse status endpoint and parsed-profile correction UI.
- Account deletion correctness.
- Quick-prep UI/API integration and prompt minimization.
- Live embedding-aware match scoring.
- Reliable Redis consumer groups/retry/DLQ in active loops.
- Alert email verification and user-email lookup fix.
- Application lifecycle beyond `redirected`.
- Rate limiting and security headers.
- OpenTelemetry traces and operational dashboards.
- Admin/KPI dashboard.
- Human screen-reader pass, security review, load-test baseline, and legal/privacy sign-off.
