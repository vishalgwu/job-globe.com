# Developer Handoff

Updated: 2026-05-11

This is the concise handoff for engineers joining the MVP. For product scope and gap detail, read `project-status.md` and `project-gap-analysis.md` first.

## Current State

The repo has meaningful MVP implementation, but it is not green:

- Web tests pass.
- Migration validation passes.
- Worker mypy passes.
- Web typecheck fails because web dependencies are not in the lockfile/installed tree.
- Worker ruff and pytest currently fail.
- CI and Docker web build config are stale/broken.

Treat Phase 1 as stabilization before feature expansion.

## Module Map

```text
apps/web
  Next.js App Router pages, client components, API routes, Zustand stores,
  Supabase helpers, job filtering, rule-based match scoring.

apps/workers/src/job_globe_workers
  Python worker plane: discovery connectors, URL verification, company identity,
  geo resolution, taxonomy tagging, canonical upsert, resume parser,
  job/profile embedders, alert evaluator, audit cleanup.

packages/database
  PostgreSQL migrations (16 files, 21 tables), seeds, validation/application scripts.

packages/shared-types
  TypeScript contracts plus partial Python placeholders.

infra
  Docker Compose, Dockerfiles, Railway config, Vercel config, k6 load tests,
  deploy/migration helper scripts.
```

## Environment Variables

Minimum variables for full local/staging behavior:

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web, workers resume parser | Required for Supabase project and Storage download. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Public browser/SSR auth key. |
| `SUPABASE_SERVICE_ROLE_KEY` | web, workers resume parser | Server-only; needed for admin DB/storage/auth actions. |
| `DATABASE_URL` | workers, migrations | Direct Postgres connection string. |
| `REDIS_URL` | web webhooks, workers | Redis stream publishing/consuming. |
| `OPENAI_API_KEY` | web, workers | Quick-prep, resume extraction, embeddings. |
| `RESEND_API_KEY` | workers | Alert email delivery; not verified. |
| `ALERT_FROM_EMAIL` | workers | Resend sender address. |
| `GREENHOUSE_WEBHOOK_SECRET` | web | HMAC key for Greenhouse webhook. |
| `LEVER_WEBHOOK_SECRET` | web | HMAC key for Lever webhook. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | workers | Adzuna connector. |
| `USAJOBS_API_KEY` / `USAJOBS_USER_AGENT` | workers | USAJOBS connector. |
| `GREENHOUSE_BOARD_TOKENS` | workers | Greenhouse polling connector. |
| `LEVER_COMPANY_SLUGS` | workers | Lever polling connector. |
| `WORKABLE_API_TOKEN` / `WORKABLE_COMPANY_SLUGS` | workers | Workable connector. |
| `SMARTRECRUITERS_COMPANY_IDS` | workers | SmartRecruiters connector; missing from root `.env.example`. |
| `REDIS_STREAM_VERIFICATION` / `REDIS_STREAM_CANONICAL` | workers | Have defaults in code; missing from root `.env.example`. |

## Important Entry Points

### Web

| Area | Path |
|---|---|
| Main globe page | `apps/web/app/(globe)/page.tsx` |
| Globe orchestration | `apps/web/components/globe/GlobeExperience/GlobeExperience.tsx` |
| Custom globe renderer | `apps/web/components/globe/GlobeCanvas/GlobeCanvas.tsx` |
| 2D fallback | `apps/web/components/globe/FallbackMap/FallbackMap.tsx` |
| Job panel | `apps/web/components/job-panel/JobPanel/JobPanel.tsx` |
| Static quick prep UI | `apps/web/components/job-panel/QuickPrepToolkit/QuickPrepToolkit.tsx` |
| Apply CTA | `apps/web/components/job-panel/ApplyCTA/ApplyCTA.tsx` |
| Onboarding | `apps/web/components/onboarding/OnboardingFlow/OnboardingFlow.tsx` |
| Resume upload control | `apps/web/components/onboarding/ResumeUpload/ResumeUpload.tsx` |
| Job data adapter | `apps/web/lib/jobs/supabaseJobs.ts` |
| Web match scorer | `apps/web/lib/match/scorer.ts` |
| Auth helper | `apps/web/lib/supabase/auth.ts` |

### API Routes

| Route | Notes |
|---|---|
| `/api/jobs` | Globe/list/detail data. Detail uses onboarding preference match only. |
| `/api/profile` | Authenticated profile GET/POST. |
| `/api/resume` | Upload/view/delete raw resume object. |
| `/api/saved-jobs` | Authenticated saved jobs. |
| `/api/applications` | Redirect application history. |
| `/api/alerts` | Alert CRUD. |
| `/api/notifications` | In-app notification feed. |
| `/api/quick-prep` | OpenAI quick-prep JSON; not wired to UI. |
| `/api/account` | Export/delete; deletion currently broken and privacy-critical. |
| `/api/webhooks/greenhouse` and `/api/webhooks/lever` | HMAC-verified Redis publishers. |

### Workers

| Module | Entry function | Current purpose |
|---|---|---|
| `agents/discovery/runner.py` | `run_discovery_loop` | Poll configured external sources and publish raw jobs. |
| `agents/verification/worker.py` | `run_verification_loop` | Check URL liveness, write `jobs_raw`, forward verified events. |
| `agents/company_identity/worker.py` | `run_company_identity_loop` | Resolve/upsert companies and forward canonical events. |
| `agents/duplicate_detection/detector.py` | `run_duplicate_detection_loop` | Resolve location, classify taxonomy, upsert `jobs_canonical`. |
| `agents/resume_parser/worker.py` | `run_resume_parser_loop` | Poll and parse uploaded resumes; currently blocked by key mismatch/tests. |
| `agents/embeddings/job_embedder.py` | `run_job_embedder_loop` | Generate job embeddings. |
| `agents/embeddings/profile_embedder.py` | `run_profile_embedder_loop` | Generate profile embeddings. |
| `agents/alert_evaluator/evaluator.py` | `run_alert_evaluator_loop` | Evaluate alerts and create notifications/deliveries. |
| `agents/audit_cleanup/worker.py` | `run_audit_cleanup_loop` | Apply audit retention policies. |
| `observability/health.py` | `log_health_loop` | Periodic health logging. |

## Do Not Overclaim

These items are present but not fully active:

- Consumer-group Redis helpers exist, but active loops use legacy `read_events()`.
- Embedding tables/workers exist, but live web match scoring does not fetch embeddings.
- Quick-prep API exists, but job panel UI still renders static fields.
- Alert email sender exists, but UI creates in-app alerts and email delivery is not verified.
- Account export/delete routes exist, but deletion is broken.
- Globe.GL/deck.gl dependencies exist, but the active renderer is custom React/CSS.

## P0 Fix List

1. Sync web package lockfile/install so `openai` and `ioredis` resolve.
2. Update `.github/workflows/ci.yml` database assertions to current 16 migrations / 21 tables.
3. Fix `infra/docker/Dockerfile.web` invalid `COPY` line.
4. Fix resume parser Storage key handling and file-type support mismatch.
5. Repair resume parser tests and ruff failures.
6. Fix `/api/account` deletion correctness.
7. Complete legal/privacy review of the draft `/privacy` route.

## Running Checks

Current known results are mixed.

```powershell
# Passing as of 2026-05-11
npm run test --workspace=apps/web
.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/validate_migrations.py packages/database/migrations

# Currently failing as of 2026-05-11
npm run typecheck
.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers
.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests
```

## Deploy Notes

- Vercel config exists but production deployment has not been verified in this audit.
- Railway worker config exists but worker deployment has not been verified in this audit.
- `deploy-staging.yml` is a placeholder.
- `infra/terraform/` is placeholder-only.
- Do not treat Docker web image as buildable until `Dockerfile.web` is fixed.
