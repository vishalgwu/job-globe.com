# Jarvis Job Globe

Last audited: 2026-05-11

Jarvis Job Globe is a startup MVP for geospatial job discovery. The product vision is a globe-first job search experience where students and early-career users can see where jobs cluster, zoom from global demand to city/company/role signals, open a trusted job panel, and apply through official employer or portal links. The longer-term product adds explainable AI matching, resume-aware skill gaps, alerts, and quick interview prep.

This repository is not public-launch ready yet. It contains a strong monorepo foundation, a working Next.js/Supabase job exploration app, database migrations, worker modules, tests, and deployment scaffolding. Several important pieces are still partial or broken and are tracked below so docs match the actual code.

## MVP Status

| MVP area | Status | Evidence / current reality |
|---|---|---|
| Globe job discovery | ⚠️ In Progress | Main UI exists in `apps/web`, using React/CSS globe components and image assets. Globe.GL, React Three Fiber, and deck.gl are installed but not active in the main renderer. |
| Filters and search | ✅ Completed | Category, country, remote mode, job type, posted-window, and text query are wired through Zustand and `/api/jobs`. City is selected through layer navigation. |
| City company bubbles and job markers | ✅ Completed | `/api/jobs` returns country, city, company bubble, marker, list, and detail modes from `jobs_canonical`. |
| Right-side job panel and official apply redirect | ✅ Completed | `JobPanel` renders details, match breakdown, quick-prep placeholder data, save action, and `ApplyCTA`; application clicks are recorded for signed-in users before redirect. |
| Auth and sessions | ✅ Completed | Supabase login/register/session/refresh/logout routes and auth-protected APIs exist. Production sign-off is still pending. |
| Onboarding profile flow | ✅ Completed | Eight-step onboarding saves profile preferences for authenticated users. Guest/demo persistence is not implemented. |
| Resume upload and parsing | ⚠️ In Progress | Upload API and resume parser worker exist, but parsing is currently blocked by a storage object-key mismatch, no parse-status API, and no correction UI. |
| Match percentage and skill-gap explanation | ⚠️ In Progress | Job detail computes a 4-signal preference match from onboarding answers. Worker-side 7-signal scorer exists. Live web scoring does not use resume extraction or pgvector embeddings yet. |
| Save, track, compare jobs | ⚠️ In Progress | Save works for authenticated users with session-storage fallback. Application tracking records only `redirected`. Compare is not implemented. |
| Alerts | ⚠️ In Progress | Alert CRUD and worker evaluator exist. UI creates in-app alerts only. Email delivery code exists but has not been verified and likely needs a user-email lookup fix. |
| Quick-prep toolkit | ⚠️ In Progress | Static quick-prep content renders in the job panel. `/api/quick-prep` exists and caches OpenAI output, but the UI is not wired to it. |
| Privacy/account controls | ⚠️ In Progress | Export/delete APIs exist, but account deletion has correctness defects. `/privacy` is a draft notice, not a legal-approved policy. |
| Production readiness | ❌ Not Started | No verified production deployment, security review, load-test baseline, human screen-reader pass, or operational dashboard. |

## Implemented Surface

- Next.js App Router web app with pages for globe, login, register, onboarding, profile, saved jobs, applications, alerts, and privacy.
- Supabase-backed API handlers for jobs, auth, profile, resume, saved jobs, applications, alerts, notifications, account export/delete, health, quick-prep, and Greenhouse/Lever webhooks.
- PostgreSQL schema with 16 migration files and 21 application tables, including pgvector embedding tables, alerts, notifications, quick-prep cache, audit events, and audit retention policies.
- Python worker package with discovery connectors for Greenhouse, Lever, Adzuna, USAJOBS, EURES, Workable, and SmartRecruiters.
- Worker modules for URL verification, company identity, geo resolution, taxonomy tagging, duplicate/canonical upsert, resume parsing, job/profile embeddings, alert evaluation, and audit cleanup.
- Shared TypeScript contracts under `packages/shared-types/typescript`.
- Docker, Vercel, Railway, GitHub Actions, migration scripts, seed data, and k6 load-test scaffolding.

## Current Blockers

- `npm run typecheck` fails because `openai` and `ioredis` are declared in `apps/web/package.json` but are missing from `package-lock.json` and the installed dependency tree.
- `.github/workflows/ci.yml` still asserts 13 migrations and 17 tables, while the repo now has 16 migrations and 21 tables.
- `infra/docker/Dockerfile.web` contains a shell-style redirect/conditional on a `COPY` instruction, which is not valid Dockerfile syntax.
- `resume_parser.worker` interprets uploaded keys like `<userId>/<file>` as `<bucket>/<path>`, so files uploaded to the `resumes` bucket will not download correctly for parsing.
- `/api/account` deletes from a non-existent `job_applications` table, does not remove raw resume objects from Supabase Storage, and does not anonymize or delete the internal `users` row.
- Active worker loops still use legacy Redis `XREAD`; consumer-group, ack, retry, and DLQ helpers are present but not wired into the running pipeline.
- Web job-detail scoring does not call `fetchEmbeddingScore()`, so pgvector embeddings are generated but not used in live match scores.
- `/api/quick-prep` sends full job descriptions to OpenAI, which conflicts with the MVP spec's stricter prompt-minimization rule.
- Alert email delivery is not product-ready: the alerts UI only creates in-app alerts, and the worker email lookup queries `auth.users` using the internal user ID.
- No API rate limiting, CSP/security headers, OpenTelemetry tracing, admin/KPI dashboard, runbooks, load-test results, human screen-reader pass, or legal/privacy sign-off.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, CSS, Zustand.
- Web API: Next.js route handlers.
- Auth, database, storage: Supabase.
- Database: PostgreSQL 15, JSONB, GIN indexes, pgvector.
- Workers: Python, Pydantic, psycopg, Redis, httpx, OpenAI SDK, structlog.
- Queue/cache: Redis Streams helpers and stream publishing; reliable consumer groups are scaffolded but not active in worker loops.
- AI: OpenAI SDK is referenced for quick-prep, resume extraction, and embeddings, but dependency and runtime integration need repair.
- Testing: Vitest for web unit/API tests, pytest/mypy/ruff for workers, SQL migration validation.
- Infrastructure: Docker Compose, Dockerfiles, Vercel config, Railway config, GitHub Actions, k6 script.

## Repository Structure

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
  load-tests/          k6 load-test script
docs/
  whole_project/       Reference DOCX product vision/spec/build plan
  md/                  Maintained architecture, status, handoff, gap docs
  decisions/           ADRs and privacy framework
  qa/                  QA evidence and artifacts
```

## Local Setup

Requirements:

- Node.js 20 or newer.
- npm 10 or newer.
- Python 3.11 or newer.
- Docker Desktop for local PostgreSQL and Redis services.
- Root `.env` based on `.env.example`.

Install:

```powershell
cd C:\college\Github\Projects\job-globe.com
npm ci
python -m venv .venv-job-globe
.\.venv-job-globe\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "apps/workers[dev]"
```

Run the web app:

```powershell
npm run dev:web
```

Run local services:

```powershell
npm run dev
```

## Verification Snapshot

Verified on 2026-05-11:

- ✅ `npm run test --workspace=apps/web`: 5 files, 48 tests passed.
- ✅ `python packages/database/scripts/validate_migrations.py packages/database/migrations`: passed, 16 files and 21 tables.
- ✅ `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src`: passed, 56 source files.
- ❌ `npm run typecheck`: fails because `openai` and `ioredis` are missing from the lockfile/installed dependencies.
- ❌ `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers`: fails on formatting/lint issues in alert evaluator/email, audit cleanup, profile embedder, and resume parser tests.
- ❌ `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests`: 98 passed, 5 failed in resume parser tests.

## Roadmap

### Phase 1 - Critical MVP Completion

- Fix dependency lockfile so web typecheck/build can resolve `openai` and `ioredis`.
- Update CI migration/table assertions to 16 migrations and 21 tables.
- Fix `Dockerfile.web` build syntax.
- Fix resume parser storage download path and add parse-status visibility.
- Fix account deletion correctness and raw resume object deletion.
- Wire quick-prep UI to `/api/quick-prep` or clearly keep it as static MVP content.
- Add API rate limiting and CSP/security headers.
- Update the `/privacy` route and complete legal/privacy review.

### Phase 2 - Core Feature Expansion

- Wire live web match scoring to pgvector embeddings and parsed resume profiles.
- Add parsed-profile review/correction UI.
- Replace legacy Redis reads with consumer groups, acknowledgements, retry, and DLQ handling.
- Verify and expose alert email delivery, or keep alerts in-app only until email is production-ready.
- Add application lifecycle states beyond `redirected`.
- Add runbooks and an admin/KPI dashboard for ingestion, embeddings, alerts, DLQ, and error health.

### Phase 3 - UI/UX, Performance, And Scaling

- Decide whether to complete Globe.GL/deck.gl integration or formally accept the custom React/CSS globe renderer.
- Run Lighthouse, real-device mobile QA, human screen-reader QA, and k6 load tests.
- Add OpenTelemetry traces and production monitoring.
- Calibrate match scoring from human review and real behavior signals.
- Replace or remove placeholder Terraform.
- Prepare production deployment and rollback proof for Vercel + Railway.

See [project-gap-analysis.md](docs/md/project-gap-analysis.md) for the detailed phase plan.
