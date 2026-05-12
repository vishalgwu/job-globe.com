# Jarvis Job Globe

Last documentation cleanup: 2026-05-11 (updated: deployment + schema patch pass)

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
| Supabase auth and session handling | Implemented; production RLS verification pending (run migration patch first). |
| Onboarding questions | Implemented for authenticated users. |
| Resume upload and parsing | Functional end-to-end. Upload → worker parser → parsed_profile. Parse status exposed via GET /api/resume. Profile page shows parse status. Requires OPENAI_API_KEY and migration 017 applied. |
| Explainable match percentage | Implemented. Rule-based scoring live; embedding cosine similarity blended in when profile_embeddings row exists (70/30 blend). |
| Saved jobs, application tracking, and comparison | Application lifecycle PATCH added (redirected → applied → interviewing → offer → rejected/withdrawn). Compare jobs via GET /api/jobs/compare. Lifecycle UI on applications page. |
| Alerts for saved searches/tracked companies | CRUD/evaluator implemented. Email delivery live via Resend (RESEND_API_KEY configured). |
| Quick-prep toolkit per opened job | Profile-aware quick prep rendered in job panel from job detail endpoint. LLM-powered /api/quick-prep route live (OPENAI_API_KEY configured). |

Post-MVP ideas such as broad auto-apply, recruiter dashboards, sponsored marketplaces, campus/white-label products, and multi-language expansion must not be treated as current MVP scope.

## Current Reality

This repository is not yet launch-ready. CI, deploy, and schema are now unblocked but the Supabase live database needs the migration patch applied before workers run cleanly.

Verified working:

- Next.js App Router web app and Supabase-backed API routes.
- Jobs API backed by `jobs_canonical` with profile-aware match scoring (rule-based + embedding blend).
- Auth pages, onboarding, saved jobs, application redirect recording + lifecycle status, alerts, and notification routes.
- Compare jobs: `GET /api/jobs/compare?ids=<uuid>,<uuid>` for side-by-side comparison.
- Application lifecycle: `PATCH /api/applications?id=<uuid>` — status advances from redirected → applied → interviewing → offer / rejected / withdrawn.
- PostgreSQL migration validation: 17 migration files, 21 application tables, `pgvector`, GIN indexes, resume uniqueness, alerts/notifications, quick-prep cache, audit retention tables, RLS policies, and `delete_internal_account()` function.
- Python worker modules for discovery, verification, canonicalization, resume parsing, embeddings, alerts, and audit cleanup — all using consumer-group Redis reads with ack, pending reclaim, and DLQ.
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) in `next.config.mjs`.
- Rate limiting middleware on all `/api/*` routes (60 req/min general, 10 req/min for /api/quick-prep and /api/resume).
- Resume parse status exposed via `GET /api/resume` (pending/done) and shown in profile UI.
- Web unit tests pass (48 tests).
- Worker mypy passes (56 files).
- Worker ruff lint passes: all three pipeline workers (`verification`, `company_identity`, `duplicate_detection`) clean.
- Worker pytest green: 106 tests pass in CI without pymupdf/unstructured installed — stubs injected via `conftest.py` sys.modules patching.
- Accessibility pass complete: `role="alert"` on all error messages, `aria-expanded` on job panel aside, `aria-busy`/`aria-live` on map viewport, `aria-label` on all icon close buttons.
- k6 load test script updated with correct query params and `mode` key assertion.
- Staging deploy workflow live: `.github/workflows/deploy-staging.yml` deploys web to Vercel and workers to Railway on every push to `main`.
- GitHub Actions secrets configured: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`.
- Environment configured: `OPENAI_API_KEY`, `RESEND_API_KEY`, Adzuna, USAJobs, and Workable connector keys set in `.env`.
- CORS: `ALLOWED_ORIGINS` env var wired into Edge middleware; OPTIONS preflight + per-response headers on all `/api/*` routes.
- Webhook guards: Greenhouse and Lever handlers have HMAC-SHA256 constant-time verification + 5-minute timestamp replay protection.
- Globe rebuilt with Globe.GL (WebGL): `GlobeCanvas` replaced with globe.gl v2.45 — real 3D Earth texture, atmosphere, density-coloured points per layer, animated camera transitions, auto-rotate with interaction pause. CSS sphere removed.

Remaining gaps (pre-launch):

- Production Supabase RLS and Storage bucket policies — verify in Supabase dashboard (Authentication → Policies). All 17 migrations confirmed applied 2026-05-12.
- Legal privacy review and `/privacy` page sign-off required before accepting real users.
- Load-test baseline run (`k6 run infra/load-tests/jobs-api.js --env BASE_URL=<staging-url>`) not yet recorded.
- SmartRecruiters, Greenhouse, and Lever connectors require company-side ATS access — not self-provisioned.
- Mobile responsiveness pass for globe viewport pending.
- Provision Redis in Railway and set `REDIS_URL` + `ALLOWED_ORIGINS` in Railway/Vercel service variables before going live.

## Retained Markdown Docs

Only these Markdown files are intentionally retained:

- `README.md` — product anchor, MVP scope, setup, and current repository truth.
- `docs/md/architecture.md` — current implementation map and technical blockers.
- `docs/decisions/privacy-framework.md` — privacy constraints and launch blockers.
- `docs/remaining_work_master.md` — full zero-hallucination audit of everything remaining, with prioritised execution order.
- `packages/config/README.md` — environment-template notes.
- `infra/load-tests/README.md` — k6 command reference for the existing load-test script.

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

Last checked (2026-05-12):

| Check | Result |
|---|---|
| `npm run test --workspace=apps/web` | Passed: 48 tests. |
| `python packages/database/scripts/validate_migrations.py packages/database/migrations` | Passed: 17 migrations, 21 tables. |
| `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src` | Passed: 56 files. |
| `npm run typecheck` | Expected to pass — `openai` and `ioredis` are in dependencies and ship their own types. Recheck after `npm ci`. |
| `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers` | Passed: no violations. |
| `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests` | Passed: 106 tests. fitz/unstructured stubbed via conftest.py. |
| Railway worker logs | Fails with `column "parsed_at" does not exist` until migration patch is applied to Supabase. |

## Documentation Discipline

Do not add Markdown files for brainstorming, future product ideas, duplicated status reports, or handoff notes. Update one of the retained docs, or track work in issues/backlog outside this repo documentation set.

Every retained doc must have one clear owner-purpose:

- Product scope belongs in this README and the DOCX source specs.
- Technical implementation truth belongs in `docs/md/architecture.md`.
- Privacy/legal launch constraints belong in `docs/decisions/privacy-framework.md`.
- Full remaining work backlog belongs in `docs/remaining_work_master.md`.
- Package-local commands or templates may stay beside the package they support.
