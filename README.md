# Job Globe

Job Globe is a job-discovery platform that lets users explore job demand geographically, open official application links, save roles, manage a profile, upload a resume file, create alerts, and view application history.

The repository has a working foundation and a complete feature set in code. The web app, API layer, AI pipeline (resume parsing, embeddings, scoring), alert delivery, Redis-backed worker pipeline, and production infrastructure configuration are all implemented. Remaining gaps are legal/privacy sign-off, human screen-reader testing, security review, and live production deployment.

## Problem Statement

Job listings are scattered across company career sites, ATS-hosted boards, government portals, and aggregators. Job Globe organizes jobs by geography, company, and role context so users can see where demand is concentrated before visiting the official application source.

## Implemented Features

- Globe-style job exploration with global, country, city/company, and role-marker views, including the `IntroOverlay` entry screen.
- Category, country, city, remote mode, job type, posted-window, and text filters.
- Job detail panel with official apply link, save action, 7-component match breakdown, and AI-generated quick-prep sections (OpenAI + 24h cache).
- 2D fallback map and accessible job-list mode.
- Supabase login, registration, session, refresh, and logout flows.
- Authenticated onboarding and profile save flow.
- Resume upload (PDF/DOCX/TXT), signed URL fetch, structured extraction via OpenAI, and raw object delete.
- Saved jobs for authenticated users, with session-storage fallback for anonymous users.
- Authenticated alerts CRUD with background alert evaluator, in-app notification feed, and Resend email delivery.
- Authenticated application click recording, history API, and applications page.
- Account deletion (full data removal) and GDPR data export APIs.
- Audit-event writes for all high-risk user and worker actions, with configurable retention policy and background cleanup.
- Python worker package: discovery (7 source connectors), URL verification, company identity, geo mapping, taxonomy tagging, canonical job upsert, resume parsing, job/profile embedding generation, alert evaluation, and audit cleanup.
- Redis Streams pipeline with consumer groups, message acknowledgement, exponential retry, and dead-letter queues.
- Webhook receivers for Greenhouse and Lever push events.
- pgvector-backed embedding retrieval and cosine similarity blend in the match scorer.
- 16 PostgreSQL migrations, 21 tables, pgvector, taxonomy seed, and demo job seed.
- Production infrastructure: Vercel config, Railway config (workers + Redis + Postgres), production Dockerfiles, and k6 load tests.
- Phase 1 staging smoke evidence for Supabase health, authenticated flow, audit rows, keyboard traversal, mobile viewport, accessibility tree, and basic performance timing.

## Not Yet Implemented

- Legal/privacy policy sign-off (required before public launch — `/privacy` route is still a draft).
- Human screen-reader accessibility pass.
- Security review sign-off (auth routes, RLS, Storage bucket policy, worker egress).
- Live production deployment and production QA evidence (Lighthouse, real mobile devices, load test results).
- Parsed-profile correction UI (worker extracts structured data; user-facing correction flow not built yet).
- Application status lifecycle beyond `redirected`.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, CSS, Zustand.
- API: Next.js route handlers.
- Auth, database, and storage: Supabase.
- Database: PostgreSQL 15 with pgvector, JSONB, GIN indexes, and full-text search.
- Workers: Python package using httpx, Pydantic, psycopg, Redis, and structlog.
- Queue/cache: Redis Streams.
- Tests: Vitest for web, mypy/pytest for workers, migration validation for SQL.
- Local infrastructure: Docker Compose.
- CI: GitHub Actions.

## Folder Structure

```text
apps/
  web/                 Next.js frontend and API routes
  workers/             Python worker package and tests
  jarvis-job-globe/    Static prototype/reference app, not the production app
packages/
  database/            SQL migrations, seeds, and migration scripts
  shared-types/        TypeScript contracts and partial Python contracts
  config/              Environment templates
infra/
  docker/              Docker Compose files and Dockerfiles
  scripts/             Migration, seed, and deployment helper scripts
  terraform/           Placeholder Terraform files
docs/
  md/                  Maintained architecture, status, handoff, and gap docs
  decisions/           ADRs and privacy framework
  whole_project/       Reference DOCX product plan/spec
```

## Documentation

Maintained docs:

- `docs/md/architecture.md`
- `docs/md/project-status.md`
- `docs/md/developer-handoff.md`
- `docs/md/project-gap-analysis.md`
- `docs/qa/phase-1-critical-completion.md`

Decision and privacy references:

- `docs/decisions/ADR-001-monorepo-structure.md`
- `docs/decisions/ADR-002-database-choice.md`
- `docs/decisions/ADR-003-globe-library.md`
- `docs/decisions/ADR-004-embedding-model.md`
- `docs/decisions/ADR-005-auth-provider.md`
- `docs/decisions/privacy-framework.md`

## Local Setup

Requirements:

- Node.js 20 or newer.
- npm 10 or newer.
- Python 3.11 or newer.
- Docker Desktop for local PostgreSQL and Redis services.
- A root `.env` file based on `.env.example`.

Install dependencies:

```powershell
cd C:\college\Github\Projects\job-globe.com

npm ci

python -m venv .venv-job-globe
.\.venv-job-globe\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "apps/workers[dev]"
```

Run only the web app:

```powershell
npm run dev:web
```

Run local services with Docker:

```powershell
npm run dev
```

Apply database migrations manually:

```powershell
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/apply_migrations.py packages/database/migrations
```

Seed demo data manually:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/database/seeds/taxonomy_reference.sql -f packages/database/seeds/demo_jobs.sql
```

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
npm run test --workspace=apps/web
.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src
.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/validate_migrations.py packages/database/migrations
```

Load tests (requires k6):

```bash
BASE_URL=https://your-app.vercel.app k6 run infra/load-tests/jobs-api.js
```

## Current Status

Full feature implementation is complete in code. Workers cover discovery, parsing, embeddings, scoring, alerts, and audit cleanup. Web covers all user-facing flows including account deletion, data export, quick-prep, notifications, and webhooks. Production infrastructure is configured for Vercel + Railway. Remaining work is legal/privacy sign-off, screen-reader testing, security review, and live production deployment.

## Roadmap

### Phase 1 - Critical Completion (done for controlled demos)

- Completed: Supabase staging health, authenticated flow, audit-row confirmation, private resume bucket, draft `/privacy` route, mobile/keyboard/accessibility-tree/performance smoke evidence, and migration validation.
- Remaining before public launch: human screen-reader pass, legal/privacy policy approval, security review, and broader production QA.

### Phase 2 - Feature Expansion (complete in code)

- IntroOverlay wired into the main globe page.
- `useAlerts()` and `useMatchScore()` hooks fully implemented.
- Resume PDF/DOCX parsing (fitz + unstructured), OpenAI structured extraction, confidence scoring.
- Job and profile embedding generation; pgvector cosine similarity blend in match scorer.
- OpenAI quick-prep generation with 24h per-user/job cache.
- Background alert evaluator, in-app notification feed, Resend email delivery with daily caps.
- Greenhouse and Lever webhook receivers.
- Redis consumer groups, acknowledgement, exponential retry, dead-letter queues.
- Account deletion and GDPR data export APIs.
- Audit retention policy with background cleanup worker.

### Phase 3 - Optimization And Scaling

- Define production worker deployment and rollback process.
- Replace placeholder Terraform with real infrastructure or remove it from scope.
- Add OpenTelemetry tracing, operational dashboards, runbooks, backup/restore procedures.
- Load test job queries and run worker replay tests.
- Calibrate matching from human review and behavioral signals.

For a numbered step-by-step breakdown, see `docs/md/project-gap-analysis.md`.
