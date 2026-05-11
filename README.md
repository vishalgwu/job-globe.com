# Job Globe

Job Globe is a job-discovery platform that lets users explore job demand geographically, open official application links, save roles, manage a profile, upload a resume file, create alerts, and view application history.

The repository is not launch-ready. It contains a working Next.js web app, Supabase-backed API routes, PostgreSQL schema, local Docker infrastructure, and Python worker pipeline code. The AI matching, resume parsing, alert delivery, privacy self-service, production infrastructure, and launch-hardening work are still incomplete.

## Problem Statement

Job listings are scattered across company career sites, ATS-hosted boards, government portals, and aggregators. Job Globe organizes jobs by geography, company, and role context so users can see where demand is concentrated before visiting the official application source.

## Implemented Features

- Globe-style job exploration with global, country, city/company, and role-marker views.
- Category, country, city, remote mode, job type, posted-window, and text filters.
- Job detail panel with official apply link, save action, rule-based match breakdown, and quick-prep sections.
- 2D fallback map and accessible job-list mode.
- Supabase login, registration, session, refresh, and logout flows.
- Authenticated onboarding and profile save flow.
- Resume raw-file upload, signed URL fetch, and raw object delete through Supabase Storage.
- Saved jobs for authenticated users, with session-storage fallback for anonymous users.
- Authenticated alerts CRUD.
- Authenticated application click recording, history API, and applications page.
- Draft `/privacy` notice route for controlled demos.
- Audit-event writes for profile updates, resume upload/delete, saved jobs, application redirects, alert create/delete, and worker failures.
- Python worker package for job discovery, URL verification, company identity, geo mapping, taxonomy tagging, and canonical job upsert.
- PostgreSQL migrations, taxonomy seed, and demo job seed.
- Phase 1 staging smoke evidence for Supabase health, authenticated user flow, audit rows, keyboard traversal, mobile viewport, accessibility tree, and basic performance timing.
- Local web tests, worker type checks, worker tests, and migration validation.

## Not Yet Implemented

- `IntroOverlay` component exists but is not wired into the main globe page.
- `useAlerts()` and `useMatchScore()` hooks are empty stubs — they return `{}` and have no real implementation.
- Background alert evaluation, in-app notification feed, and email delivery.
- Resume PDF/DOCX parsing and structured profile extraction (only `.txt` is handled; PDF/DOCX raises `NotImplementedError`).
- Job/profile embedding generation and pgvector-backed semantic matching.
- Generated quick-prep content and caching.
- Account deletion, data export, and parsed-profile correction.
- Complete audit administration, retention policy, and reporting.
- Redis consumer groups, message acknowledgement, retries, and dead-letter queue handling.
- Production worker deployment and real Terraform infrastructure (placeholder only).
- Full launch QA, load testing, legal/privacy review, and security review evidence.

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

Commands verified locally during the Phase 1 pass on 2026-05-11:

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

## Current Status

Current state: working foundation with a functional web app, API layer, database schema, worker pipeline code, and controlled-demo Phase 1 staging evidence. The worker pipeline exists in code but is not production-proven from this repository. AI matching, resume parsing, alert delivery, privacy self-service, observability, and production deployment remain open.

## Roadmap

### Phase 1 - Critical Completion

- Completed for controlled demos: Supabase staging health, authenticated flow, audit-row confirmation, private resume bucket, draft `/privacy` route decision, mobile/keyboard/accessibility-tree/performance smoke evidence, and migration validation.
- Remaining before public launch: human screen-reader pass, legal/privacy policy approval, security review, and broader production QA.

### Phase 2 - Feature Expansion

- Wire `IntroOverlay` into the main globe page.
- Implement `useAlerts()` and `useMatchScore()` hooks with real data.
- Implement resume PDF/DOCX parsing, structured extraction, confidence scoring, and correction UI.
- Generate and store job/profile embeddings; activate pgvector-backed semantic matching.
- Generate and cache quick-prep content.
- Build alert evaluator, in-app notification feed, and email delivery.
- Add webhook receivers, source rate-limit handling, Redis consumer groups, retries, and dead-letter queues.
- Implement account deletion, data export, and parsed-profile correction.

### Phase 3 - Optimization And Scaling

- Define production worker deployment and rollback process.
- Replace placeholder Terraform with real infrastructure or remove it from scope.
- Add OpenTelemetry tracing, operational dashboards, runbooks, backup/restore procedures.
- Load test job queries and run worker replay tests.
- Calibrate matching from human review and behavioral signals.

For a numbered step-by-step breakdown, see `docs/md/project-gap-analysis.md`.
