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
- Authenticated application history API and page.
- Python worker package for job discovery, URL verification, company identity, geo mapping, taxonomy tagging, and canonical job upsert.
- PostgreSQL migrations, taxonomy seed, and demo job seed.
- Local web tests, worker type checks, worker tests, and migration validation.

## Not Yet Implemented

- Background alert evaluation, in-app notification feed, and email delivery.
- Resume PDF/DOCX parsing and structured profile extraction.
- Job/profile embedding generation and pgvector-backed semantic matching.
- Generated quick-prep content and caching.
- Privacy page, account deletion, data export, and parsed-profile correction.
- Apply-click recording from the main job panel.
- Production worker deployment and real Terraform infrastructure.
- Recorded launch QA, load testing, and security review evidence.

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
  workers/             Python worker package, tests, and legacy placeholder folders
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

Commands verified locally during the documentation audit on 2026-05-10:

```powershell
npm run test --workspace=apps/web
.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src
.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/validate_migrations.py packages/database/migrations
```

## Current Status

Current state: working foundation with a functional web app, API layer, database schema, and worker pipeline code. The worker pipeline exists in code but is not production-proven from this repository. AI matching, resume parsing, alert delivery, privacy self-service, observability, and production deployment remain open.

## Roadmap

### Phase 1 - Critical Completion

- Add or replace the missing `/privacy` policy target.
- Record application clicks from the Apply CTA.
- Add audit-event writes for sensitive user and worker actions.
- Clean or quarantine legacy worker placeholder folders.
- Confirm Supabase staging configuration and record launch QA evidence.

### Phase 2 - Feature Expansion

- Implement resume parsing, structured extraction, confidence review, and correction UI.
- Implement embeddings and pgvector-backed candidate retrieval.
- Generate and cache quick-prep content.
- Add alert evaluation, in-app notifications, and email delivery.
- Add webhook receivers, source rate-limit handling, Redis consumer groups, retries, and dead-letter queues.

### Phase 3 - Optimization And Scaling

- Define production worker deployment and rollback process.
- Replace placeholder Terraform with real infrastructure or remove it from scope.
- Add tracing, dashboards, runbooks, load tests, replay tests, and security review evidence.
- Calibrate matching from human review and behavioral signals.
