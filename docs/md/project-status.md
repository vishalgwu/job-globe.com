# Project Status

Updated: 2026-05-11

Source of truth: the codebase, SQL migrations, tests, and local configuration in this repository. The reference DOCX files in `docs/whole_project` describe the planned product, but this status reflects only what is implemented in code.

## Current Architecture

Job Globe is currently a monorepo with:

- `apps/web`: Next.js App Router frontend and backend-for-frontend route handlers.
- `apps/workers`: Python worker package plus tests.
- `packages/database`: PostgreSQL migrations, seeds, and migration scripts.
- `packages/shared-types`: TypeScript contracts and partial Python contracts.
- `packages/config`: environment templates only.
- `infra`: Docker local infrastructure plus placeholder Terraform/deploy assets.

Runtime flow:

```text
external job APIs -> Python workers -> Redis Streams -> PostgreSQL
PostgreSQL/Supabase -> Next.js API routes -> globe UI/profile pages
Supabase Auth/Storage -> protected user, profile, resume, saved-job, alert, and application flows
```

## Current State

The repository has a working foundation, web experience, API layer, schema, and worker pipeline code. The worker pipeline is implemented in code and covered by tests, but production deployment and live-run evidence are not captured in this repository. Planned AI matching, resume parsing, alert delivery, privacy self-service, audit administration, and production hardening are incomplete.

## Completed

| Area             | Ground-truth status                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo         | `apps`, `packages`, `infra`, `.github`, and `docs` are present.                                                                                                                                                                                 |
| Web app          | Next.js App Router app exists with globe, auth, onboarding, profile, saved jobs, alerts, and application pages.                                                                                                                                 |
| Job discovery UI | React/CSS globe-style experience, filters, zoom controls, fallback map/list, job panel, save action, match breakdown display, and quick-prep display are implemented.                                                                           |
| API routes       | Jobs, health, auth session/refresh/logout, profile, resume, saved jobs, alerts, and applications routes exist.                                                                                                                                  |
| Auth             | Supabase auth helpers and login/register pages are implemented. Protected API routes use `resolveRequestUser()`.                                                                                                                                |
| Profile          | Onboarding answers can be validated and saved for authenticated users.                                                                                                                                                                          |
| Resume storage   | Authenticated users can upload a raw resume file to Supabase Storage, fetch a signed URL, and delete the raw object key.                                                                                                                        |
| Saved jobs       | Authenticated saved jobs persist through the API; anonymous saves use session storage.                                                                                                                                                          |
| Alerts CRUD      | Alerts can be created, listed, paused/resumed, and deleted.                                                                                                                                                                                     |
| Applications     | Application redirects are recorded through the Apply CTA and can be listed by API/page.                                                                                                                                                         |
| Privacy target   | A draft `/privacy` route exists so resume consent no longer points to a missing route.                                                                                                                                                          |
| Audit events     | Selected audit writes exist for profile updates, resume upload/delete, saved jobs, application redirects, alert create/delete, and worker failures.                                                                                             |
| Workers          | Active package under `apps/workers/src/job_globe_workers` includes discovery, source connectors, verification, company identity, geo mapping, taxonomy tagging, duplicate/canonical upsert, Redis helpers, DB repositories, and health logging. |
| Worker cleanup   | Earlier top-level worker placeholder folders were removed; active worker code now lives under `apps/workers/src/job_globe_workers`.                                                                                                             |
| Database         | 14 migrations define the expected 17 application tables plus indexes, pgvector support, taxonomy seeds, demo job seeds, and one-current-resume-row-per-user invariant.                                                                          |
| CI coverage      | GitHub Actions defines web, worker, and database checks.                                                                                                                                                                                        |
| Phase 1 QA       | Staging Supabase health, authenticated profile/resume/save/apply/alert flow, audit rows, private resume bucket, mobile screenshots, keyboard traversal, accessibility tree, and basic performance timing are recorded for controlled demos.     |

## In Progress

| Area               | Implemented part                                                                                                   | Missing part                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Globe UX           | Main experience, filters, list fallback, panel, and pages exist.                                                   | `IntroOverlay` is not wired into the main page; active globe implementation does not use Globe.GL/deck.gl heatmap layers despite dependencies being installed; full launch accessibility/performance evidence is not complete. |
| Pipeline           | Worker code and tests exist for the main ingestion/enrichment pipeline.                                            | No evidence in repo that live staging ingestion is running from three sources; no webhook receiver, Redis consumer groups, dead-letter queue, or source rate-limit bucket implementation.                                      |
| Matching           | Rule-based match scoring and UI breakdown exist; optional embedding-score blending is supported by pure functions. | Job/profile embedding generation and pgvector retrieval are not active. The planned 7-component scorer is not implemented.                                                                                                     |
| Resume             | Upload/storage/delete routes exist.                                                                                | Worker resume extraction only reads `.txt`; PDF/DOCX parsing, profile normalisation, confidence review UI, and automated raw-file deletion job are missing.                                                                    |
| Alerts             | Alert CRUD and active-alert cap exist.                                                                             | Background alert evaluation, email delivery, digest bundling, and in-app notification feed are missing.                                                                                                                        |
| Applications       | API, page, and Apply CTA recording exist.                                                                          | Application status lifecycle beyond `redirected` is not implemented.                                                                                                                                                           |
| Privacy/compliance | Resume consent copy, draft `/privacy` route, selected audit writes, and resume retention fields exist.             | Delete/export/correction flows, audit administration, audit retention policy, and legal/privacy sign-off are not implemented.                                                                                                  |
| Infrastructure     | Docker Compose, Dockerfiles, CI, and Vercel handoff files exist.                                                   | Terraform is placeholder-only; staging deploy workflow is a placeholder; production worker deployment is not defined.                                                                                                          |

## Not Implemented

- Full production alert worker and transactional email integration.
- Resume PDF/DOCX parsing, structured extraction, confidence review, and user correction flow.
- OpenAI embedding generation and pgvector-backed semantic retrieval.
- OpenAI quick-prep generation and cache.
- Webhook receiver for Greenhouse/Lever.
- Dead-letter queues, consumer groups, and retry acknowledgement semantics for Redis Streams.
- Admin/KPI dashboard.
- Self-service account delete, data export, and profile correction.
- Complete audit administration, reporting, retention policy, and coverage beyond the Phase 1 audit events.
- Production-grade Terraform/cloud infrastructure.
- Full launch QA: Lighthouse, human screen-reader pass, real mobile devices, security review, and load tests.

## Remaining Work

Phase 1 has closed the controlled-demo blockers for privacy target, application-click tracking, selected audit-event writes, legacy placeholder cleanup, staging Supabase health, authenticated flow evidence, audit-row confirmation, private resume bucket setup, and basic browser/mobile/accessibility/performance smoke evidence. Remaining launch work is legal/privacy sign-off, human screen-reader testing, security review, and broader production QA.

Phase 2 should implement planned product expansion: resume parsing, embeddings, semantic matching, generated quick prep, alert evaluator/delivery, webhook receivers, and robust Redis processing.

Phase 3 should harden for launch: production worker deployment, observability, real infrastructure, runbooks, load tests, replay tests, backups, rollback, and security review evidence.

## Current Workflow

Local development uses npm for the web workspace and `.venv-job-globe` for the Python worker package. Docker Compose can run Postgres, Redis, web, and workers together. Migrations are applied through `packages/database/scripts/apply_migrations.py`, and CI validates web, worker, and database checks.

Maintained docs now live in:

- `docs/md/architecture.md`
- `docs/md/developer-handoff.md`
- `docs/md/project-status.md`
- `docs/md/project-gap-analysis.md`
- `docs/qa/phase-1-critical-completion.md`

Older duplicate API/status/module docs were removed. Existing ADR and privacy documents remain as decision/compliance references.

## Verification

Commands verified locally during this Phase 1 pass:

```powershell
npm run test --workspace=apps/web
.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src
.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests
.\.venv-job-globe\Scripts\python.exe packages/database/scripts/validate_migrations.py packages/database/migrations
```

Results on 2026-05-11:

- Web tests: 5 files, 48 tests passed.
- Worker mypy: 45 source files passed.
- Worker pytest: 86 tests passed.
- Migration validation: 14 files, 17 tables, pgvector, GIN indexes, and resume uniqueness present.
