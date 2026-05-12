# Jarvis Job Globe

Last project audit: 2026-05-12

Jarvis Job Globe is a startup MVP for geospatial job discovery. It helps students and early-career candidates explore hiring demand by location, understand fit against their profile or resume, and apply through official employer or job-board links.

The product vision documents live in `docs/whole_project`. This README is the operational truth for the current repository.

## Current Status

The repository is a working MVP codebase for a controlled demo, but it is not ready for public launch. The web app, worker plane, database migrations, Docker configs, and CI checks are in place. Remaining work is mainly production verification, legal/privacy sign-off, real data operations, load testing, and observability hardening.

## Repository Map

| Path                    | Purpose                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `apps/web`              | Next.js App Router frontend and API routes.                                                  |
| `apps/workers`          | Python worker package for ingestion, parsing, embeddings, alerts, audit cleanup, and health. |
| `apps/jarvis-job-globe` | Static prototype/reference app, not the production app.                                      |
| `packages/database`     | PostgreSQL/Supabase migrations, seeds, migration validator, and apply script.                |
| `packages/shared-types` | Shared TypeScript contracts and partial Python contracts.                                    |
| `packages/config`       | Environment-template notes only.                                                             |
| `infra/docker`          | Dockerfiles and Docker Compose files for local/dev/prod-like runs.                           |
| `infra/load-tests`      | k6 jobs API load-test script and run notes.                                                  |
| `infra/terraform`       | Placeholder infrastructure-as-code files only.                                               |
| `.github/workflows`     | CI and staging deployment workflows.                                                         |

## Product Capabilities

| Capability                | Current implementation                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Globe-based job discovery | Implemented with `globe.gl` WebGL globe, density points, camera transitions, and 2D fallback map.                                 |
| Discovery layers          | Global, country, city, and job-marker/neighbourhood UI layers. A true sub-city neighbourhood data model is still not implemented. |
| Filters                   | Role/category, country, city, remote mode, job type, freshness, and text search.                                                  |
| Supabase auth             | Login, register, session, refresh, logout, protected profile flows.                                                               |
| Onboarding                | Authenticated onboarding profile save/load.                                                                                       |
| Resume upload and parsing | Upload to private Supabase Storage, parse-status API/UI, worker-based text extraction and OpenAI structured parsing.              |
| Match scoring             | Rule-based scoring plus embedding cosine blend when job/profile embeddings exist.                                                 |
| Saved jobs                | Authenticated saved-job API and UI.                                                                                               |
| Application tracking      | Official apply redirect recording plus lifecycle PATCH/status UI.                                                                 |
| Job comparison            | `GET /api/jobs/compare` and side-by-side compare UI for 2-4 jobs.                                                                 |
| Alerts                    | Alert CRUD, evaluator worker, in-app notifications, Resend email delivery path.                                                   |
| Quick prep                | Job panel calls `/api/quick-prep`, uses OpenAI JSON output, and caches results in `quick_prep_cache`.                             |
| Privacy/account rights    | Resume deletion, account export, and account deletion API paths exist; user-facing settings UI and legal sign-off remain.         |

Post-MVP ideas such as broad auto-apply, recruiter dashboards, sponsored marketplaces, campus/white-label products, and multi-language expansion are not current MVP scope.

## Runtime Flow

```text
Browser
  -> Next.js pages and client components
  -> Next.js API routes
  -> Supabase Auth, PostgreSQL, and Storage

External job sources and ATS webhooks
  -> Redis discovery stream
  -> verification worker
  -> company identity worker
  -> duplicate/canonical job worker
  -> jobs_canonical, companies, locations, taxonomy

User resume upload
  -> Supabase Storage
  -> resume parser worker
  -> resume_extractions.parsed_profile
  -> profile embeddings and match scoring

Alerts and prep
  -> alert evaluator worker
  -> alert_deliveries and notifications
  -> optional Resend email
  -> OpenAI quick-prep route with cache
```

## Local Setup

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

Run the local Docker stack:

```powershell
npm run dev
```

Apply and validate migrations:

```powershell
npm run migration:check
npm run migration:apply
```

`.env` and `.venv-job-globe/` are intentionally ignored. Use `.env.example` as the committed template and keep real secrets only in local or platform secret stores.

## CI/CD

`CI` runs on pull requests and pushes to `main`:

- Web: `npm ci`, lint, typecheck, Vitest, Next build.
- Workers: Python 3.11, editable install with `[dev]`, ruff, mypy, pytest.
- Database: pgvector Postgres service, migration validation, migration apply, taxonomy/demo seeds, table-count checks.

`Deploy Staging` runs on pushes to `main`:

- Deploys the web app to Vercel preview using prebuilt output.
- Deploys workers to Railway with `railway up --service workers --detach`.
- Queries the deployed `/api/health` endpoint and now fails the smoke-test job unless status is `ok`.

Deployment still does not automatically apply production Supabase migrations or seeds. Run and verify migrations separately before treating a deployment as launch-ready.

## Verification Snapshot

Local checks run on 2026-05-12:

| Check                                                                                  | Result                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run lint`                                                                         | Passed.                                                            |
| `npm run typecheck`                                                                    | Passed.                                                            |
| `npm run test --workspace=apps/web`                                                    | Passed: 49 tests.                                                  |
| `npm run build`                                                                        | Passed. Next.js emitted a middleware-to-proxy deprecation warning. |
| `python packages/database/scripts/validate_migrations.py packages/database/migrations` | Passed: 17 migrations, 21 tables.                                  |
| `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers`                      | Passed.                                                            |
| `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src`                        | Passed: 57 source files.                                           |
| `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests`                    | Passed: 106 tests.                                                 |

Not verified in this pass:

- Hosted GitHub Actions run after these edits.
- Actual Vercel/Railway deployment.
- Production Supabase RLS and Storage dashboard state.
- k6 load-test baseline against staging.
- Full browser/mobile visual QA of the current WebGL globe.

## Remaining Launch Work

Highest priority before real users:

1. Verify production/staging secrets in Vercel, Railway, Supabase, and GitHub Actions: Supabase keys, `OPENAI_API_KEY`, `RESEND_API_KEY`, `REDIS_URL`, `ALLOWED_ORIGINS`, webhook secrets, and connector credentials.
2. Apply and verify all 17 migrations in Supabase, including RLS policies, the private `resumes` bucket, storage policies, taxonomy seed, and demo/real data expectations.
3. Run the staging deploy workflow from GitHub and confirm both Vercel web and Railway workers are healthy.
4. Run `k6` against staging and record baseline p95/error-rate results.
5. Replace draft privacy copy with legal-approved policy text and document AI/subprocessor handling.
6. Complete mobile and browser QA for the current WebGL globe, job panel, compare tray, onboarding, and resume upload path.
7. Add persistent observability: shared rate limiting, metrics, traces, logs, alerting, and a production KPI/admin view.

Longer-running backlog:

- Terraform is still placeholder-only.
- Production migrations/seeds are not automated in deploy.
- `middleware.ts` should move to the newer Next.js `proxy` convention.
- User-facing account export/delete settings UI is missing.
- Parsed-profile correction UI is missing.
- Python shared types for `profile` and `match` are still placeholders.
- Demo seed data uses fictional companies and should not be treated as production job supply.

## Retained Markdown Docs

Only these Markdown files are intentionally retained:

- `README.md` - product anchor, MVP scope, setup, CI/CD, and current repository truth.
- `docs/md/architecture.md` - implementation map and technical flow.
- `docs/decisions/privacy-framework.md` - privacy constraints and launch blockers.
- `docs/remaining_work_master.md` - full remaining-work backlog and execution order.
- `packages/config/README.md` - environment-template notes.
- `infra/load-tests/README.md` - k6 command reference.

Do not add Markdown files for brainstorming, duplicated status reports, or handoff notes. Update one of the retained docs or track work outside the repository documentation set.
