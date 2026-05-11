# Developer Handoff

This is the concise module map for developers joining the project. For deeper status and gap detail, see `project-status.md` and `project-gap-analysis.md`.

## Current Architecture

```text
apps/web
  Next.js pages, client components, API routes, Zustand stores, Supabase helpers

apps/workers/src/job_globe_workers
  Python discovery, verification, company identity, geo, taxonomy, canonicalisation

packages/database
  PostgreSQL migrations, seeds, migration validation/application scripts

packages/shared-types
  TypeScript contracts and partial Python contracts

infra
  Docker local environment plus placeholder Terraform/deploy assets
```

Current data flow:

```text
source APIs -> worker connectors -> Redis Streams -> worker enrichment -> PostgreSQL
PostgreSQL/Supabase -> Next.js route handlers -> globe/profile UI
Supabase Auth/Storage -> protected user and resume workflows
```

## Completed Features

- Main globe experience at `apps/web/app/(globe)/page.tsx`.
- Filter bar, zoom controls, CSS/React globe view, fallback map, accessible list mode, and job panel.
- Login, register, onboarding, profile, saved jobs, applications, and alerts pages.
- Draft privacy notice at `/privacy`.
- Jobs, profile, resume, saved jobs, alerts, applications, health, and auth API routes.
- Supabase auth resolution into internal `users` rows.
- Resume raw upload, signed URL read, and raw object delete.
- Apply CTA records authenticated redirects before opening the official apply URL.
- Selected audit-event writes exist for high-risk user actions and worker failures.
- Active worker package with discovery, verification, company identity, geo mapping, taxonomy tagging, canonical job upsert, Redis helpers, and DB repositories.
- Seven source connector classes: Greenhouse, Lever, Adzuna, USAJOBS, EURES, Workable, and SmartRecruiters.
- 13 database migrations, 17 application tables, pgvector, taxonomy seed, and demo job seed.
- Local web tests, worker mypy, worker pytest, and migration validation.

## Frontend

Purpose: user-facing job discovery, onboarding, profile management, saved jobs, alerts, and application history.

Key files:

- `apps/web/components/globe/GlobeExperience/GlobeExperience.tsx`
- `apps/web/components/globe/GlobeCanvas/GlobeCanvas.tsx`
- `apps/web/components/globe/FallbackMap/FallbackMap.tsx`
- `apps/web/components/filters/FilterBar/FilterBar.tsx`
- `apps/web/components/job-panel/*`
- `apps/web/components/onboarding/*`
- `apps/web/stores/*`
- `apps/web/__tests__/*`

In progress or missing:

- `IntroOverlay` exists but is not wired into the active globe page.
- `useAlerts()` and `useMatchScore()` are stubs.
- Launch accessibility/performance evidence is not recorded.

## API

Purpose: backend-for-frontend route handlers around Supabase and shared job/profile logic.

Key files:

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

In progress or missing:

- No delete account, export data, or parsed-profile correction APIs.
- Alert CRUD exists, but no background alert evaluator/delivery worker.
- Application status lifecycle beyond `redirected` is not implemented.
- Audit administration, retention, and complete event coverage are not implemented.

## Workers

Purpose: discover, verify, enrich, and canonicalize external job data.

Key files:

- `apps/workers/src/job_globe_workers/main.py`
- `apps/workers/src/job_globe_workers/settings.py`
- `apps/workers/src/job_globe_workers/agents/discovery/*`
- `apps/workers/src/job_globe_workers/agents/verification/*`
- `apps/workers/src/job_globe_workers/agents/company_identity/*`
- `apps/workers/src/job_globe_workers/agents/geo_mapping/geocoder.py`
- `apps/workers/src/job_globe_workers/agents/categorisation/tagger.py`
- `apps/workers/src/job_globe_workers/agents/duplicate_detection/detector.py`
- `apps/workers/src/job_globe_workers/db/repositories/*`

In progress or missing:

- No dedicated ranking worker.
- No resume parsing worker beyond `.txt` extraction helper.
- No embedding generation worker.
- No alert evaluation/delivery worker.
- No webhook receiver, dead-letter queue, consumer group acking, or explicit rate-limit bucket implementation.
- Earlier top-level worker placeholder folders were removed; keep new worker code under `apps/workers/src/job_globe_workers`.

## Database

Purpose: canonical data model for users, jobs, profile data, worker state, and planned AI/compliance features.

Key files:

- `packages/database/migrations/*.sql`
- `packages/database/seeds/taxonomy_reference.sql`
- `packages/database/seeds/demo_jobs.sql`
- `packages/database/scripts/validate_migrations.py`
- `packages/database/scripts/apply_migrations.py`

In progress or missing:

- Embedding tables exist, but no active generation pipeline writes them.
- Audit table exists and selected Phase 1 events are logged, but retention/reporting coverage is incomplete.
- Alert table exists, but no delivery history table exists.
- No production backup/restore runbook in this repo.

## Shared Packages And Config

Purpose: shared contracts and environment examples.

Key files:

- `packages/shared-types/typescript/*.ts`
- `packages/shared-types/python/*.py`
- `packages/config/environments/*.env.example`
- `.env.example`

In progress or missing:

- Python shared `profile.py` and `match.py` are placeholders.
- Config package is documentation/templates only, not a runtime library.

## Remaining Work

- Phase 1: staging Supabase confirmation plus browser, keyboard, screen-reader, and basic performance QA evidence.
- Phase 2: resume parsing, profile correction UI, embeddings, semantic matching, generated quick prep, alert delivery, webhooks, Redis consumer groups/retries/dead letters.
- Phase 3: production worker deployment, real infrastructure, observability, runbooks, load tests, replay tests, backup/restore, rollback, and security review evidence.

## Current Workflow

Install from the project root:

```powershell
npm ci

python -m venv .venv-job-globe
.\.venv-job-globe\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "apps/workers[dev]"
```

Run web only:

```powershell
npm run dev:web
```

Run local services:

```powershell
npm run dev
```

Run current local checks:

```powershell
npm run test --workspace=apps/web
.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src
.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/validate_migrations.py packages/database/migrations
```
