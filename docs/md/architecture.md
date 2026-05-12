# Architecture

Updated: 2026-05-12

This file is the living implementation map for Jarvis Job Globe. It records what exists in code today, how the main flow works, and which technical gaps still matter for launch.

## Runtime Shape

```text
Browser
  -> Next.js App Router pages
  -> client components and Zustand stores
  -> Next.js API route handlers
  -> Supabase Auth, PostgreSQL, and Storage

Job source connectors and ATS webhooks
  -> Redis Streams
  -> Python worker pipeline
  -> canonical jobs, companies, locations, taxonomy, embeddings

Resume upload
  -> private Supabase Storage bucket
  -> resume parser worker
  -> structured parsed_profile and confidence JSON
  -> profile embeddings

Alerts and prep
  -> alert evaluator worker
  -> alert_deliveries and notifications
  -> optional Resend email
  -> OpenAI quick-prep route with database cache
```

## Repository Map

```text
apps/web/              Next.js frontend and API routes
apps/workers/          Python worker package and tests
apps/jarvis-job-globe/ Static prototype/reference app, not production
packages/database/     SQL migrations, seeds, validators, apply scripts
packages/shared-types/ TypeScript contracts and partial Python contracts
packages/config/       Environment-template notes
infra/docker/          Dockerfiles and Docker Compose files
infra/load-tests/      k6 jobs API script
infra/terraform/       Placeholder files only
docs/whole_project/    Product vision/source specification DOCX files
docs/md/               This architecture map only
docs/decisions/        Privacy framework only
```

## Web App

`apps/web` uses Next.js App Router, React, TypeScript, Zustand, Supabase clients, `globe.gl`, `ioredis` for webhook routes, and the OpenAI SDK for quick prep.

Implemented pages:

- `/` - globe/job discovery experience.
- `/login` and `/register` - Supabase auth pages.
- `/onboarding` - onboarding profile and resume upload entry point.
- `/profile` - profile summary plus raw resume view/delete and parse status.
- `/saved` - saved jobs.
- `/applications` - official-apply redirect history and lifecycle status updates.
- `/alerts` - alert CRUD.
- `/privacy` - draft privacy notice, not legal-approved.

The primary map uses `GlobeCanvas` with `globe.gl`. `FallbackMap` remains available when WebGL is unavailable or the user toggles 2D mode.

## API Routes

| Route                                                        | Auth     | Current behavior                                                                                              |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/jobs`                                              | Optional | Global/country/city/jobs/detail data from `jobs_canonical`; detail uses profile-aware scoring when signed in. |
| `GET /api/jobs/compare`                                      | Optional | Fetches 2-4 jobs by ID for side-by-side comparison and top-match calculation.                                 |
| `GET /api/health`                                            | No       | Environment and Supabase health check.                                                                        |
| `/api/auth/session`, `/api/auth/refresh`, `/api/auth/logout` | Mixed    | Supabase session state, refresh, and logout.                                                                  |
| `GET/POST /api/profile`                                      | Yes      | Load/upsert onboarding profile.                                                                               |
| `GET/POST/DELETE /api/resume`                                | Yes      | Upload raw resume, return signed URL and parse status, delete current raw object.                             |
| `GET/POST/DELETE /api/saved-jobs`                            | Yes      | Saved-job persistence for authenticated users.                                                                |
| `GET/POST/PATCH/DELETE /api/alerts`                          | Yes      | Alert CRUD and active-state updates.                                                                          |
| `GET/POST/PATCH /api/applications`                           | Yes      | List, record, and update application lifecycle status.                                                        |
| `GET /api/quick-prep`                                        | Optional | OpenAI generated interview prep cached in `quick_prep_cache`.                                                 |
| `GET/PATCH /api/notifications`                               | Yes      | Notification feed and mark-read.                                                                              |
| `GET/DELETE /api/account`                                    | Yes      | Data export and account deletion via Storage cleanup, DB function, and Supabase Auth delete.                  |
| `POST /api/webhooks/greenhouse`, `POST /api/webhooks/lever`  | HMAC     | Constant-time HMAC verification, timestamp freshness check, Redis stream publish.                             |

Protected routes use `resolveRequestUser()`.

## Worker Pipeline

Active entry point: `apps/workers/src/job_globe_workers/main.py`.

```text
discovery runner
  -> discovery stream
     -> verification worker
        -> jobs_raw and verification stream
           -> company identity worker
              -> companies and canonical stream
                 -> duplicate/canonical worker
                    -> resolve_location()
                    -> classify()
                    -> jobs_canonical

resume parser
  -> resume_extractions rows
  -> Supabase Storage download
  -> text extraction for PDF/DOCX/TXT
  -> OpenAI structured extraction
  -> parsed_profile, confidence, parsed_at

embedding workers
  -> OpenAI embeddings
  -> job_embeddings and profile_embeddings

alert evaluator
  -> active alerts and new jobs
  -> alert_deliveries and notifications
  -> optional Resend email

audit cleanup
  -> audit_retention_policies
  -> audit_events.expires_at
  -> expired audit deletion

health
  -> periodic structured health logs
  -> HTTP GET /health on WORKER_HEALTH_PORT
```

The stream workers use consumer groups, `XACK`, stale pending reclaim via `XAUTOCLAIM`, retry counts, and DLQ publishing through `<stream>.dlq`.

## Database

Migration validation passes for:

- 17 migration files.
- 21 application tables.
- `pgvector` extension.
- GIN and vector indexes.
- `resume_extractions.user_id` uniqueness.
- `alert_deliveries`, `notifications`, and `quick_prep_cache`.
- `audit_retention_policies` and expiring audit events.
- `delete_internal_account(UUID)`.
- RLS policy definitions and Supabase Storage bucket/policy definitions guarded for Supabase environments.

Production verification still has to happen in the Supabase dashboard because CI uses a plain pgvector Postgres image and cannot prove Supabase Auth/Storage policy behavior.

## Match Scoring

The live job detail path calls `getJobDetailWithProfile()`:

1. `fetchEmbeddingScore(jobId, profileId, supabase)` computes cosine similarity when both embeddings exist.
2. `buildMatchBreakdown(profileSnap, jobSnap, embeddingScore)` blends embedding score at 70% and rule-based score at 30% when available.
3. Rule-based scoring considers remote preference, location, job type, role family, and taxonomy.

The worker-side Python scorer is richer and is currently used by alert evaluation.

## CI/CD

`CI` workflow:

- Web job: install, lint, typecheck, Vitest, Next build.
- Worker job: Python 3.11, install `apps/workers[dev]`, ruff, mypy, pytest.
- Database job: pgvector Postgres service, validate/apply migrations, seed taxonomy/demo data, assert 21 app tables and 17 migrations.

`Deploy Staging` workflow:

- Runs on push to `main`.
- Deploys web to Vercel preview with prebuilt output.
- Deploys workers to Railway.
- Smoke-tests `/api/health` and fails unless the response status is `ok`.

Known CI/CD limitations:

- Deployment does not apply Supabase migrations or seeds.
- Deployment does not run k6.
- Railway health endpoint exists in code, but Railway-specific health-check configuration still needs production verification.
- Hosted GitHub Actions were not rerun during the 2026-05-12 local audit.

## Security And Privacy

Implemented:

- Security headers in `next.config.mjs`: CSP, HSTS in production, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- API CORS allowlist through `ALLOWED_ORIGINS`.
- In-process API rate limiting in middleware: 60 req/min general, 10 req/min for `/api/quick-prep` and `/api/resume`.
- HMAC webhook verification for Greenhouse and Lever with replay-window checks.
- Private resume Storage pathing and raw resume deletion paths.
- Account export and deletion API paths.

Still required:

- Legal review of privacy policy text.
- Production dashboard verification of RLS and Storage policies.
- User-facing account settings UI for export/delete.
- Parsed-profile correction UI.
- Shared/distributed rate limiting for multi-instance production.

## Technical Gaps

| Area                    | Current gap                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Terraform               | `infra/terraform` contains placeholders only.                                                               |
| Observability           | Web metrics are in-process; worker tracing is a structlog stub; no external metrics/tracing sink.           |
| Load testing            | k6 script exists; no staging baseline artifact is recorded.                                                 |
| Production data         | Demo seed is fictional; real connectors and ATS access must be configured and verified.                     |
| Mobile QA               | Current WebGL globe needs full mobile/browser verification.                                                 |
| Next.js convention      | `middleware.ts` works, but Next.js 16 warns that the middleware convention is deprecated in favor of proxy. |
| Shared Python contracts | `profile.py` and `match.py` are placeholders.                                                               |
| Neighbourhood model     | UI has a job-marker neighbourhood layer, but there is no true sub-city neighbourhood schema/API.            |
