# job-globe.com

Job Globe is structured as a monorepo for the Jarvis Job Globe build plan.

## One-command Local Environment

```powershell
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

`npm.cmd run dev` starts PostgreSQL 15 + pgvector, Redis 7, the placeholder web app, and the placeholder worker image through Docker Compose.

For an explicit Docker smoke test:

```powershell
docker compose -f infra/docker/docker-compose.dev.yml up -d postgres redis
docker cp packages/database/seeds docker-postgres-1:/tmp/job-globe-seeds
docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres psql -U job_globe -d job_globe -v ON_ERROR_STOP=1 -f /tmp/job-globe-seeds/taxonomy_reference.sql -f /tmp/job-globe-seeds/demo_jobs.sql
docker compose -f infra/docker/docker-compose.dev.yml up -d --build web workers
```

## Repository Layout

- `apps/web` - Next.js frontend application shell
- `apps/workers` - Python background worker plane and agents
- `packages/database` - SQL migrations, seeds, and schema validation
- `packages/shared-types` - TypeScript and Python contracts shared across apps
- `packages/config` - Shared environment and feature flag configuration
- `infra` - Local Docker, Terraform, deployment, migration, and seed scripts
- `docs` - ADRs, architecture notes, API contracts, privacy docs, and runbooks

Shared logic belongs in `packages`; application folders do not import directly from each other.

## Step 1 Verification

```powershell
npm.cmd run verify:step1
.\.venv-job-globe\Scripts\python.exe -m ruff check apps\workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps\workers\src
.\.venv-job-globe\Scripts\python.exe -m pytest -p no:cacheprovider apps\workers\tests
```

Step 1 is complete. The repository baseline, local Docker baseline, Supabase staging database, Vercel deployment, GitHub branch protection, Product Owner approval, and Legal/Privacy approval are recorded in `docs/qa/step-1-completion-report.md`.

Live deployment:

```text
https://job-globe-com-web.vercel.app/
```
