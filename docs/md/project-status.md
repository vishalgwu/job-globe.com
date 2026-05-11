# Project Status

Updated: 2026-05-11

Source of truth: `docs/whole_project` for MVP intent, and the current codebase/tests/config for implementation status.

## Summary

Jarvis Job Globe is in an advanced MVP build state, not launch-ready and not feature-complete. The repository has a usable web app shell, Supabase-backed job data flow, profile/onboarding, saved jobs, application redirect tracking, alert CRUD, worker modules, database migrations, and deployment scaffolding. The latest audit found several blockers that make previous "complete in code" claims too optimistic.

## Product Scope From MVP Docs

The MVP scope is:

- Global-to-city zoomable job globe.
- Filters for category, country, city, remote mode, internship/new-grad/full-time.
- City-level company bubbles.
- Right-side job panel with official apply redirect.
- User login/session management.
- 2-10 onboarding questions.
- Resume upload and parse.
- Match percentage with skill-gap explanation.
- Save, track, and compare jobs.
- Alerts for saved searches and tracked companies.
- Quick-prep toolkit per opened job.

Post-MVP items include broad auto-apply, recruiter dashboards, sponsored placements, multi-language launch, and white-label/campus deployments.

## Feature Status

| Area | Status | Current implementation |
|---|---|---|
| Monorepo structure | ✅ Completed | `apps`, `packages`, `infra`, `.github`, and `docs` are present and generally organized. |
| Product docs | ✅ Completed | Reference DOCX docs exist in `docs/whole_project`; maintained markdown docs now reflect the audit. |
| Database schema | ✅ Completed | 16 migrations, 21 tables, pgvector, indexes, seeds, validation script. |
| Web pages | ✅ Completed | Globe, auth, onboarding, profile, saved, applications, alerts, privacy pages exist. |
| Globe UI | ⚠️ In Progress | Custom React/CSS globe, fallback map, zoom layers, company bubbles, job markers, accessible list mode. Globe.GL/deck.gl not active. |
| Jobs API | ✅ Completed | `/api/jobs` supports global/country/city/jobs/detail modes from Supabase. |
| Auth | ✅ Completed | Supabase auth pages and helper routes exist; production sign-off still pending. |
| Onboarding/profile | ✅ Completed | Eight-step authenticated profile save flow. |
| Resume upload | ⚠️ In Progress | `/api/resume` uploads/deletes raw files and stores metadata. Parser worker exists but cannot currently download uploaded keys correctly. |
| Resume parsing | ❌ Not Working | Worker code exists, but tests fail and the Storage key convention is mismatched with upload behavior. |
| Parsed-profile correction | ❌ Not Started | No user-facing review/edit UI. |
| Saved jobs | ✅ Completed | Authenticated DB save plus anonymous session-storage fallback. |
| Application tracking | ⚠️ In Progress | Redirect record works through `applications`; lifecycle beyond `redirected` is missing. |
| Compare jobs | ❌ Not Started | No compare UI or API. |
| Alerts UI/API | ⚠️ In Progress | CRUD exists; UI creates in-app alerts. Delivery channel selection is not complete. |
| Alert evaluator | ⚠️ In Progress | Worker inserts deliveries/notifications and has Resend code, but email path is not verified and likely has a user-ID/email lookup bug. |
| Notifications | ✅ Completed | API exists for listing and marking notifications read. |
| Quick-prep UI | ⚠️ In Progress | Job panel renders static/precomputed quick-prep fields from job detail. |
| Quick-prep API | ⚠️ In Progress | `/api/quick-prep` generates/caches OpenAI JSON, but UI is not wired and prompt minimization needs correction. |
| Match scoring | ⚠️ In Progress | Web live path uses a 4-signal rule scorer from onboarding preferences. Worker 7-signal scorer exists. Resume/embedding-aware live scoring is not active. |
| Embeddings | ⚠️ In Progress | Job/profile embedding workers exist and tables exist. Live web scorer does not use stored vectors. |
| Redis/event bus | ⚠️ In Progress | Streams are used. Consumer-group helpers exist but active worker loops still use legacy `XREAD` without ack/retry/DLQ. |
| Webhooks | ⚠️ In Progress | Greenhouse and Lever HMAC routes publish to Redis. Replay protection and signature rotation are missing. |
| Audit events | ⚠️ In Progress | Several user/worker audit writes exist plus retention cleanup. Coverage is incomplete and no reporting UI exists. |
| Account export | ⚠️ In Progress | Export route exists. Needs privacy/security review. |
| Account deletion | ❌ Broken | Route references `job_applications` instead of `applications`, does not delete raw Storage objects, and leaves the internal `users` row. |
| Privacy page | ⚠️ In Progress | `/privacy` has been updated as a draft notice, but it is not legal-approved. |
| Security hardening | ❌ Not Started | No rate limiting, CSP headers, formal RLS/storage/API review, or penetration test evidence. |
| Observability | ⚠️ In Progress | Structured logs and stubs exist. No OpenTelemetry traces/dashboard/Alertmanager-equivalent. |
| CI | ❌ Broken/Stale | Web typecheck fails locally; CI database assertions still expect old migration/table counts. |
| Production deploy | ❌ Not Started | Vercel/Railway config exists, but no verified live production deployment or rollback evidence. |

## Current Verification Results

Commands run during this audit:

| Check | Result |
|---|---|
| `npm run test --workspace=apps/web` | ✅ Passed: 5 files, 48 tests. |
| `python packages/database/scripts/validate_migrations.py packages/database/migrations` | ✅ Passed: 16 files, 21 tables. |
| `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src` | ✅ Passed: 56 source files. |
| `npm run typecheck` | ❌ Failed: `openai` and `ioredis` missing from lockfile/installed dependencies. |
| `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers` | ❌ Failed: 11 lint issues across alert evaluator/email, audit cleanup, profile embedder, and resume parser tests. |
| `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests` | ❌ Failed: 98 passed, 5 failed in resume parser tests. |

## High-Priority Defects

| Defect | Impact | Priority |
|---|---|---|
| `package-lock.json` missing `openai` and `ioredis` dependencies | Web typecheck/build/CI fail after `npm ci`. | P0 |
| CI database job expects 13 migrations / 17 tables | CI database check is stale against current 16/21 schema. | P0 |
| `Dockerfile.web` invalid `COPY ... 2>/dev/null || true` | Web Docker image likely cannot build. | P0 |
| Resume parser storage key mismatch | Uploaded resumes are unlikely to parse. | P0 |
| Account deletion references wrong table and misses raw Storage deletion | Privacy-critical flow is broken. | P0 |
| Active Redis loops do not use consumer groups/DLQ | Worker reliability claims are overstated. | P1 |
| Live web scoring does not use embeddings or parsed resumes | Match-score MVP is only preference-based. | P1 |
| Quick-prep UI not wired to quick-prep API | User-facing quick prep is static. | P1 |
| Quick-prep prompt includes full job description | Conflicts with prompt-minimization/privacy requirement. | P1 |
| Alert email path unverified and likely wrong user-email lookup | Email alerts should not be claimed as done. | P1 |
| No rate limiting or CSP headers | Security gap before public use. | P1 |

## Working Areas

- Core SQL migrations are coherent and validated by the repo script.
- Web unit/API tests pass.
- Worker mypy passes.
- Jobs API and custom globe UI have meaningful structure.
- Onboarding, profile save, saved jobs, and application redirect tracking are real code paths.
- Connector modules and enrichment modules are present and covered by many tests.

## Human-Gated Work

These require owner/operator/legal/QA action in addition to code:

- Legal/privacy review of resume handling, account deletion/export, OpenAI processing, and `/privacy` copy.
- Supabase RLS and Storage bucket policy review.
- Production environment variable setup for Vercel/Railway/Supabase/Redis/OpenAI/Resend.
- Human screen-reader pass with NVDA, VoiceOver, or JAWS.
- Security review or penetration test.
- Staging/production load-test baseline.
- Production deployment and rollback proof.
