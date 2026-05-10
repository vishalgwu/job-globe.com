# Jarvis Job Globe

Jarvis Job Globe is a full-stack job discovery platform. Users can browse worldwide job demand through an interactive globe, filter jobs, inspect details, save roles, manage a profile, upload a resume, create alerts, and track application redirects.

Production URL: https://job-globe-com-web.vercel.app/

## Current Status

The core product is implemented and the repository is in launch hardening / Phase 6 prep.

For the centralized handoff documentation, use:

- [Project Status](docs/md/PROJECT_STATUS.md)
- [Frontend Module](docs/md/FRONTEND.md)
- [API Module](docs/md/API.md)
- [Workers Module](docs/md/WORKERS.md)
- [Database Module](docs/md/DATABASE.md)
- [Infrastructure Module](docs/md/INFRASTRUCTURE.md)
- [Shared Packages Module](docs/md/SHARED_PACKAGES.md)

## Repository Layout

```text
apps/
  web/                 Next.js web app and API routes
  workers/             Python worker package and tests
  jarvis-job-globe/    Original static prototype/reference
packages/
  database/            SQL migrations, seeds, migration scripts
  shared-types/        TypeScript and Python contracts
  config/              Environment templates
infra/
  docker/              Docker Compose and Dockerfiles
  scripts/             Deployment/migration helper scripts
  terraform/           Placeholder infrastructure files
docs/
  md/                  Central module and project status documentation
  api/                 Older API-specific notes
  architecture/        Architecture notes
  decisions/           ADRs and privacy framework
```

## Main Architecture

```text
Browser
  -> Next.js web app and API routes
  -> Supabase Auth, Database, and Storage

Python workers
  -> external job sources
  -> Redis Streams
  -> PostgreSQL canonical job tables

PostgreSQL / Supabase
  -> jobs, profiles, resumes, saved jobs, alerts, applications, audit data
```

The web app reads job data through API routes. Workers are responsible for ingesting and enriching job data. Shared contracts live under `packages/shared-types`.

## Local Development

### Requirements

- Node.js 20 or newer
- npm 10 or newer
- Python 3.11 or newer
- Docker Desktop for PostgreSQL, Redis, and containerized local runs

### Install dependencies

```powershell
npm ci

python -m venv .venv-job-globe
.\.venv-job-globe\Scripts\activate
python -m pip install -e "apps/workers[dev]"
```

### Environment

Copy `.env.example` to `.env` and fill in local values. Do not commit `.env`.

Important groups:

- Supabase URL, anon key, service role key
- `DATABASE_URL`
- Redis URL
- Optional source connector API keys
- Optional alert/email and embedding keys

### Run the web app only

```powershell
npm run dev:web
```

### Run local services with Docker

```powershell
npm run dev
```

This uses `infra/docker/docker-compose.dev.yml`.

## Common Checks

```powershell
npm run lint
npm run typecheck
npm run test --workspace=apps/web
npm run build

.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src
.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests

python packages/database/scripts/validate_migrations.py packages/database/migrations
```

## CI/CD

GitHub Actions runs:

- web lint, typecheck, tests, and build
- worker ruff, mypy, and pytest
- database migration validation and apply checks

Vercel deploys the web app from `main`.

## Documentation Rules

- Use `docs/md/PROJECT_STATUS.md` for project-manager status.
- Use one module file in `docs/md` for developer handoff notes.
- Keep detailed docs short and link to code paths instead of duplicating code.
- Update docs when API contracts, worker flows, migrations, or launch status change.
