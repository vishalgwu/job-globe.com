# Architecture

Updated: 2026-05-11 (Phase 2–4 execution pass)

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
| `GET /api/jobs` | Optional | Globe/list/detail data from `jobs_canonical`. Detail path uses rule-based + embedding-blend match scoring when the user is signed in. |
| `GET /api/jobs/compare` | Optional | Fetch 2–4 jobs by ID for side-by-side comparison; includes profile-aware match scores. |
| `GET /api/health` | No | Environment and Supabase health check. |
| `/api/auth/session`, `/api/auth/refresh`, `/api/auth/logout` | Mixed | Supabase session state, refresh, and logout. |
| `GET/POST /api/profile` | Yes | Load/upsert onboarding profile. |
| `GET/POST/DELETE /api/resume` | Yes | Upload raw resume to Storage, return signed URL + parse status (pending/done), delete current raw object. |
| `GET/POST/DELETE /api/saved-jobs` | Yes | Saved jobs; anonymous fallback is client-side session storage. |
| `GET/POST/PATCH/DELETE /api/alerts` | Yes | Alert CRUD. |
| `GET/POST/PATCH /api/applications` | Yes | List, record, and update application lifecycle status (redirected → applied → interviewing → offer / rejected / withdrawn). |
| `GET /api/quick-prep` | Optional | OpenAI quick-prep JSON cached in `quick_prep_cache`. Profile-aware quick-prep is also computed inline in the job detail response. |
| `GET/PATCH /api/notifications` | Yes | Notification feed and mark-read. |
| `GET/DELETE /api/account` | Yes | Data export and full account deletion (Storage objects + DB rows via `delete_internal_account()` + Supabase Auth user). |
| `POST /api/webhooks/greenhouse`, `POST /api/webhooks/lever` | HMAC | HMAC-verified webhook push to Redis discovery stream. |

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

All three pipeline workers (verification, company_identity, duplicate_detection) now use `read_group_events()` + `ack_event()` + `read_pending_events()` from `event_bus/consumer.py`. Stale pending messages are reclaimed via XAUTOCLAIM, and messages exceeding `redis_max_retries` are published to the DLQ stream (`<stream>.dlq`). Consumer group names come from `settings.redis_consumer_group` and `settings.redis_consumer_name`.

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

Live match scoring in `getJobDetailWithProfile()` (blended):

1. `fetchEmbeddingScore(jobId, profileId, supabase)` — cosine similarity between `job_embeddings` and `profile_embeddings` rows. Returns null if either row is absent (embedder worker hasn't run yet).
2. `buildMatchBreakdown(profileSnap, jobSnap, embeddingScore)` — blends embedding score (70% weight) with rule-based scoring (30%) when an embedding score is available, or uses rule-only (100%) as fallback.
3. Rule-based signals: remote preference, location, job type, role family/taxonomy.

The Python scoring engine (`match_engine.py`) has a richer 7-component scorer (skill overlap, seniority, location, remote, employment type, role family, salary) used by the alert evaluator.

## Infrastructure

- `vercel.json` points Vercel to `apps/web`.
- `railway.json` targets `infra/docker/Dockerfile.workers`.
- Docker Compose files define Postgres, Redis, web, and workers.
- `.github/workflows/ci.yml` is stale and still expects older database counts.
- `.github/workflows/deploy-staging.yml` is a placeholder echo job.
- `infra/docker/Dockerfile.web` contains invalid Dockerfile syntax in one `COPY` line.
- `infra/terraform/` is placeholder-only.

## Remaining Launch Blockers

| Area | Status |
|---|---|
| Security headers | ✅ Fixed. CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy in `next.config.mjs`. |
| Rate limiting | ✅ Fixed. `middleware.ts` — 60 req/min general, 10 req/min for quick-prep and resume. |
| Redis consumer groups | ✅ Fixed. All three pipeline workers use consumer groups with ack, reclaim, and DLQ. |
| Resume parse status | ✅ Fixed. `GET /api/resume` returns parseStatus + parsedAt; profile page shows it. |
| Match scoring | ✅ Fixed. Embedding cosine similarity blended into live job detail path. |
| Application lifecycle | ✅ Fixed. `PATCH /api/applications` with full status progression. |
| Compare jobs | ✅ Fixed. `GET /api/jobs/compare?ids=...` route added. |
| Staging deploy | ✅ Fixed. Vercel + Railway deploy workflow in `.github/workflows/deploy-staging.yml`. |
| Worker ruff lint | ✅ Fixed. All three pipeline workers pass `ruff check` with no violations. |
| Worker pytest | ⚠️ Needs verification — resume extractor tests require `fitz` and `unstructured` in CI. |
| Legal privacy page | ⚠️ `/privacy` page has draft text; requires legal sign-off before accepting real users. |
| RLS/Storage verification | ⚠️ Migration 017 contains policies; requires live Supabase project verification. |
| Accessibility audit | ✅ Fixed. `role="alert"` on all error messages, `aria-expanded` on job panel, `aria-busy` on map viewport, `aria-label` on close buttons, `aria-live` on status regions. |
| Load test baseline | ⚠️ k6 script updated (`infra/load-tests/jobs-api.js`) with correct params and `mode` key assertion; baseline run not yet recorded against staging. |
| Terraform | ⚠️ `infra/terraform/` is placeholder-only. |
