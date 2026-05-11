# Jarvis Job Globe

Last documentation cleanup: 2026-05-11

Jarvis Job Globe is a startup MVP for geospatial job discovery. The product helps students and early-career candidates see hiring demand by location, understand their fit, and apply through official employer or job-board links.

The source product vision is `docs/whole_project`. This README is the operational entry point for the current repository.

## MVP Contract

The MVP must stay focused on:

| Capability | Current status |
|---|---|
| Global-to-city job discovery map/globe | In progress. A custom React/CSS globe exists; Globe.GL/deck.gl are not active. |
| Filters for role/category, country/city, remote mode, internship/new-grad/full-time | Mostly implemented. City is mainly selected through map navigation. |
| City-level company and job signals | Implemented through canonical job/location/company data, with UI simplification still needed. |
| Right-side job detail panel with official apply redirect | Implemented. |
| Supabase auth and session handling | Implemented; production security review pending. |
| Onboarding questions | Implemented for authenticated users. |
| Resume upload and parsing | Blocked. Upload and parser exist, but Storage key handling breaks parser download. |
| Explainable match percentage | Partial. Preference-based scoring is live; resume/embedding-aware scoring is not wired into the live job detail path. |
| Saved jobs, application tracking, and comparison | Partial. Saved jobs and redirect records exist; comparison and lifecycle tracking are missing. |
| Alerts for saved searches/tracked companies | Partial. CRUD/evaluator exist; email and tracked-company behavior need verification. |
| Quick-prep toolkit per opened job | Partial. API/cache exist; UI integration and prompt minimization are incomplete. |

Post-MVP ideas such as broad auto-apply, recruiter dashboards, sponsored marketplaces, campus/white-label products, and multi-language expansion must not be treated as current MVP scope.

## Current Reality

This repository is not launch-ready. It contains a useful foundation, but build, worker, privacy, and integration blockers remain.

Verified working:

- Next.js App Router web app and Supabase-backed API routes.
- Jobs API backed by `jobs_canonical`.
- Auth pages, onboarding, saved jobs, application redirect recording, alerts, and notification routes.
- PostgreSQL migration validation: 16 migration files, 21 application tables, `pgvector`, GIN indexes, resume uniqueness, alerts/notifications, quick-prep cache, and audit retention tables.
- Python worker modules for discovery, verification, canonicalization, resume parsing, embeddings, alerts, and audit cleanup.
- Web unit tests pass.
- Worker mypy passes.

Known blockers:

- `npm run typecheck` fails because `openai` and `ioredis` are declared but missing from the lockfile/installed dependency tree.
- Worker ruff and pytest are not green.
- Resume parsing is not end-to-end functional.
- Account deletion is privacy-critical and currently incorrect.
- Active Redis worker loops still use legacy `XREAD`; consumer-group/DLQ helpers are scaffolded but not wired.
- Quick-prep UI integration, prompt minimization, and live embedding-aware match scoring are incomplete.
- CI database assertions, web Dockerfile syntax, production security headers/rate limits, deployment proof, load-test baseline, accessibility pass, and legal privacy review are missing.

## Retained Markdown Docs

Only these Markdown files are intentionally retained:

- `README.md` - product anchor, MVP scope, setup, and current repository truth.
- `docs/md/architecture.md` - current implementation map and technical blockers.
- `docs/decisions/privacy-framework.md` - privacy constraints and launch blockers.
- `packages/config/README.md` - environment-template notes.
- `infra/load-tests/README.md` - k6 command reference for the existing load-test script.

The DOCX files in `docs/whole_project` remain the product vision/source specification and are intentionally not duplicated into more Markdown summaries.

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

Run the local stack:

```powershell
npm run dev
```

## Verification Snapshot

Last checked during the documentation cleanup:

| Check | Result |
|---|---|
| `npm run test --workspace=apps/web` | Passed: 48 tests. |
| `python packages/database/scripts/validate_migrations.py packages/database/migrations` | Passed: 16 migrations, 21 tables. |
| `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src` | Passed: 56 files. |
| `npm run typecheck` | Fails: missing `openai` and `ioredis`. |
| `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers` | Fails: worker lint issues. |
| `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests` | Fails: resume parser tests. |

## Documentation Discipline

Do not add Markdown files for brainstorming, future product ideas, duplicated status reports, or handoff notes. Update one of the retained docs, or track work in issues/backlog outside this repo documentation set.

Every retained doc must have one clear owner-purpose:

- Product scope belongs in this README and the DOCX source specs.
- Technical implementation truth belongs in `docs/md/architecture.md`.
- Privacy/legal launch constraints belong in `docs/decisions/privacy-framework.md`.
- Package-local commands or templates may stay beside the package they support.
