# Project Status

Updated: 2026-05-10

Source of truth: the codebase, SQL migrations, tests, and local configuration in this repository.

## Current Architecture

Job Globe is a monorepo with:

- `apps/web`: Next.js App Router frontend and backend-for-frontend route handlers.
- `apps/workers`: Python worker package plus tests.
- `packages/database`: PostgreSQL migrations (16 files, 21 tables), seeds, and migration scripts.
- `packages/shared-types`: TypeScript contracts and partial Python contracts.
- `packages/config`: environment templates only.
- `infra`: Docker local + production infrastructure, Railway config, Vercel config, load tests.

Runtime flow:

```text
external job APIs → Python workers → Redis Streams (consumer groups) → PostgreSQL
Greenhouse/Lever webhooks → /api/webhooks/* → Redis discovery stream
Supabase Storage → resume_parser worker → resume_extractions table
jobs_canonical → job_embedder → job_embeddings (pgvector)
profiles → profile_embedder → profile_embeddings (pgvector)
alert evaluator → alert_deliveries + notifications + Resend email
PostgreSQL/Supabase → Next.js API routes → globe UI / profile / quick-prep
Supabase Auth/Storage → protected user, profile, resume, saved-job, alert, application flows
```

## Completed

| Area | Status |
|---|---|
| **Monorepo structure** | `apps`, `packages`, `infra`, `.github`, `docs` all present and organised. |
| **Web app pages** | `/`, `/login`, `/register`, `/onboarding`, `/profile`, `/saved`, `/applications`, `/alerts`, `/privacy`. All implemented. |
| **IntroOverlay** | Component wired into `GlobeExperience` — shows on first load with enter/personalize/mute controls. |
| **Globe UX** | React/CSS globe, country/city/company/job-marker views, filters, zoom, fallback map, accessible list mode, job panel. |
| **API routes (19 total)** | jobs, health, auth (session/refresh/logout), profile, resume, saved-jobs, alerts, applications, quick-prep, notifications, account (delete + export), webhooks (greenhouse, lever). |
| **Auth** | Supabase auth with `resolveRequestUser()` protecting all authenticated routes. |
| **Profile** | Onboarding → profile save, preferences JSONB, display_name, resume_consent_accepted. |
| **Resume storage** | Upload (PDF/DOCX/TXT), signed URL read, raw object delete via Supabase Storage. |
| **Resume parsing** | Worker extracts text (fitz for PDF, unstructured for DOCX, direct for TXT), calls OpenAI for structured profile JSON with per-field confidence scores, writes to `resume_extractions`. |
| **Saved jobs** | Authenticated (API-backed) + anonymous (session storage fallback). |
| **Alerts CRUD** | Create, list, pause/resume, delete. Active-alert cap enforced. |
| **Alert evaluator** | Background worker polls active alerts, scores new jobs, inserts `alert_deliveries` + `notifications`, dispatches Resend email with daily cap. |
| **In-app notifications** | `notifications` table, `GET /api/notifications` (list), `PATCH /api/notifications` (mark read). |
| **Email delivery** | Resend REST integration with HTML digest builder and per-user daily cap enforcement. |
| **Applications** | Apply CTA records redirect, `GET/POST /api/applications`, applications page. |
| **Account deletion** | `DELETE /api/account` removes all user data across all tables + Supabase Storage + auth user. |
| **Data export** | `GET /api/account` returns full GDPR JSON export of all user data. |
| **Privacy target** | Draft `/privacy` route acceptable for controlled demos. |
| **Audit events** | Writes for all Phase 1 actions. `expires_at` column added. Configurable retention via `audit_retention_policies` table. Background cleanup worker deletes expired rows. |
| **Match scoring** | Rule-based 7-component scorer (skill 30%, seniority 15%, location 15%, remote 15%, employment_type 10%, role_family 10%, salary 5%). Cosine similarity blend when embeddings are available. |
| **Embeddings** | `job_embedder` and `profile_embedder` workers generate OpenAI `text-embedding-3-small` vectors and write to `job_embeddings` / `profile_embeddings`. pgvector ANN index active. |
| **pgvector retrieval** | `fetchEmbeddingScore()` in `apps/web/lib/match/scorer.ts` queries both embedding tables and returns cosine similarity for live blending. |
| **Quick-prep** | `GET /api/quick-prep?jobId=...` generates OpenAI `gpt-4o-mini` interview prep JSON, cached 24h per job/user in `quick_prep_cache`. |
| **Webhooks** | `POST /api/webhooks/greenhouse` and `/api/webhooks/lever` — HMAC-SHA256 verified, parse job payloads and publish to Redis discovery stream. |
| **Redis pipeline** | Consumer groups (`XREADGROUP`, `XACK`, `XAUTOCLAIM`), exponential retry, dead-letter queue via `stream.dlq`. `publish_to_dlq` writes original payload + error. Legacy `read_events()` kept. |
| **Worker agents (active)** | discovery (7 connectors), verification, company_identity, geo_mapping, categorisation, duplicate_detection/canonical_upsert, resume_parser, job_embedder, profile_embedder, alert_evaluator, audit_cleanup. |
| **Source connectors** | Greenhouse, Lever, Adzuna, USAJOBS, EURES, Workable, SmartRecruiters. |
| **Database** | 16 migrations, 21 application tables, pgvector, GIN indexes, taxonomy seed, demo job seed, resume uniqueness constraint. |
| **Hooks** | `useAlerts()` — full CRUD with optimistic updates. `useMatchScore()` — fetches job detail, extracts `matchBreakdown`, returns typed score. |
| **CI** | GitHub Actions: web (lint, typecheck, test, build), workers (ruff, mypy, pytest), database (migration validation). |
| **Infrastructure** | `vercel.json`, `railway.json`, `Dockerfile.web` (standalone), `Dockerfile.workers`, `docker-compose.prod.yml`, Railway deploy script, migrate-and-seed script. |
| **Load tests** | k6 script at `infra/load-tests/jobs-api.js` — ramp to 50 VUs, p95 < 500ms threshold. |
| **Phase 1 QA** | Staging Supabase health, authenticated flow, audit rows, private resume bucket, mobile screenshots, keyboard traversal, accessibility tree, and basic performance timing recorded. |

## In Progress

| Area | Status |
|---|---|
| **Parsed-profile correction UI** | Worker extracts and stores structured profile. Frontend correction flow (UI to review/edit parsed fields) is not yet built. |
| **Application status lifecycle** | Only `redirected` state implemented. Full lifecycle (viewed, shortlisted, rejected, etc.) not built. |
| **Legal/privacy sign-off** | `/privacy` route is a draft. Legal review not completed. Required before public launch. |
| **Security review** | Auth routes, Supabase RLS, Storage bucket policy, and worker egress have not been formally reviewed. |
| **Accessibility** | Keyboard/accessibility-tree smoke evidence captured. Human screen-reader pass not done. |

## Not Implemented

- Parsed-profile correction flow (user-facing UI to fix OpenAI extraction errors).
- Application status lifecycle beyond `redirected`.
- KPI / admin dashboard.
- Full Lighthouse CI budgets and real-device QA.
- Load test execution evidence (script exists; no recorded results against production).
- Legal/privacy policy finalisation and sign-off.
- Security review and penetration testing sign-off.

## Current Workflow

Install from the project root:

```powershell
npm ci

python -m venv .venv-job-globe
.\.venv-job-globe\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "apps/workers[dev]"
```

Run local checks:

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

Apply new migrations (015 + 016) to staging:

```powershell
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/apply_migrations.py packages/database/migrations
```

## Verification Results (Phase 1 pass, 2026-05-11)

- Web tests: 5 files, 48 tests passed.
- Worker mypy: 45 source files passed.
- Worker pytest: 86 tests passed (+ new resume_extractor and match_engine_v2 tests).
- Migration validation: 16 files, 21 tables, pgvector, GIN indexes, resume uniqueness, alert deliveries, audit retention present.
