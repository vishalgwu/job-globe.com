# Project Gap Analysis

Updated: 2026-05-11

This document compares the implementation against the MVP source documents in `docs/whole_project`. It intentionally avoids claiming features that are only scaffolded or planned.

## Implementation vs MVP

| MVP feature | Status | What exists | Remaining gap |
|---|---|---|---|
| Global-to-city zoomable job globe | ⚠️ In Progress | Custom React/CSS globe, four logical layers, 2D fallback, accessible list mode. | Not Globe.GL/deck.gl; needs performance/real-device validation. |
| Filters for category/country/city/remote/type | ✅ Completed | Filter bar and `/api/jobs` query parsing for category, country, city, remote, type, posted window, text query. | City filter is primarily reached through map navigation, not a direct city dropdown. |
| City-level company bubbles | ✅ Completed | Company bubble data and UI markers in city layer. | Needs production-scale performance proof. |
| Right-side job panel with official apply redirect | ✅ Completed | Job panel, apply CTA, saved state, redirect recording. | Direct API accepts any HTTP(S) apply URL; security review needed. |
| Login/session management | ✅ Completed | Supabase auth pages and session helpers. | Production env/callback/RLS review still needed. |
| 2-10 onboarding questions | ✅ Completed | Eight-step onboarding flow. | Guest/demo mode text should be cleaned up because profile save requires auth. |
| Resume upload and parse | ❌ Broken | Upload API, Storage metadata, parser worker, extraction code. | Parser cannot currently download uploaded object keys correctly; tests fail; no parse-status endpoint. |
| Match percent with skill-gap explanation | ⚠️ In Progress | Web detail path returns a 4-signal preference match; worker 7-signal scorer exists. | No resume-aware live scoring, no embedding-aware live scoring, no calibrated skill-gap explanation. |
| Save, track, compare jobs | ⚠️ In Progress | Save jobs and application redirect tracking exist. | Compare missing; application lifecycle beyond `redirected` missing. |
| Alerts for saved searches/tracked companies | ⚠️ In Progress | Alert CRUD, in-app notification table, evaluator worker. | Saved-search integration is basic; tracked-company UX missing; email delivery unverified. |
| Quick-prep toolkit | ⚠️ In Progress | Static/precomputed quick-prep fields render; API exists separately. | UI is not wired to `/api/quick-prep`; prompt minimization needs correction. |
| Privacy controls | ⚠️ In Progress | Export/delete route code exists; audit retention exists; `/privacy` draft notice exists. | Account deletion broken; legal sign-off missing. |

## Architecture Issues

| Issue | Evidence | Risk |
|---|---|---|
| Active Redis pipeline is less reliable than docs claimed | Worker loops call `read_events()` rather than consumer-group helpers. | Crashed workers can lose/reprocess messages without explicit ack/retry/DLQ handling. |
| Resume parser cannot process uploaded files as written | Upload stores `raw_object_key` as `<userId>/<uuid>.<ext>`; parser treats first path segment as bucket. | Resume parse MVP will fail after upload. |
| Account deletion is privacy-critical and broken | Route deletes `job_applications`, but schema table is `applications`; raw Storage objects and internal user row are not cleaned. | Public launch blocker and trust/legal risk. |
| Live match scoring ignores embeddings | `fetchEmbeddingScore()` is unused in the live job detail path. | Match quality and docs overstate AI/semantic capability. |
| Quick-prep prompt is broader than spec | `/api/quick-prep` includes full job description. | Violates planned minimization rule; may increase cost and privacy/compliance review burden. |
| Email alert lookup likely uses wrong ID | Worker queries `auth.users WHERE id = internal user_id`. | Email alerts may silently fail even if Resend is configured. |
| CI is stale | `.github/workflows/ci.yml` still checks for 13 migrations/17 tables. | CI will fail or provide false confidence. |
| Web Dockerfile is invalid | `COPY ... 2>/dev/null || true` is not Dockerfile syntax. | Containerized web deployment/smoke tests fail. |

## Tech Debt

| Item | Location | Priority |
|---|---|---|
| Lockfile missing `openai` and `ioredis` | `package-lock.json`, `apps/web/package.json` | P0 |
| Stale CI table/migration assertions | `.github/workflows/ci.yml` | P0 |
| Invalid web Dockerfile COPY line | `infra/docker/Dockerfile.web` | P0 |
| Resume parser tests broken | `apps/workers/tests/parsers/test_resume_extractor.py` | P0 |
| Parser imports make OpenAI hard to mock | `parsers/resume_extractor.py` | P1 |
| API allows `.doc`/`.rtf` but extractor supports only `.txt/.pdf/.docx` | `/api/resume`, `resume_extractor.py` | P1 |
| Consumer-group helpers not used by active loops | `event_bus/consumer.py`, worker loop modules | P1 |
| Web and worker match-scoring formulas diverge | `apps/web/lib/match/scorer.ts`, `workers/scoring/match_engine.py` | P1 |
| Python shared-types placeholders | `packages/shared-types/python/profile.py`, `match.py` | P2 |
| Inline styles in profile pages | `apps/web/app/(profile)/*` | P3 |
| Placeholder Terraform | `infra/terraform/*` | P3 |

## Missing Integrations

- OpenAI/ioredis dependency lockfile sync for web build/typecheck.
- Live web scoring integration with `job_embeddings` and `profile_embeddings`.
- Resume parser integration with actual Supabase Storage object paths.
- Parse-status API or UI polling after upload.
- Parsed-profile correction UI.
- Resend email delivery end-to-end verification and email lookup fix.
- Rate limiting middleware or route-level rate guards.
- CSP/security headers in `next.config.mjs`.
- OpenTelemetry exporter and dashboard.
- CI-triggered staging deployment.
- Runbooks for workers, alerts, backup/restore, rollback, and incident response.
- Legal-approved privacy policy or external policy URL.

## Scalability Concerns

- `/api/jobs` limits result sets to 500 and performs several filters in memory after Supabase fetch. This is acceptable for a demo seed but needs query/index and pagination strategy for larger corpora.
- Active stream consumers use basic `XREAD`; scaling worker replicas requires consumer groups and idempotent processing.
- Quick-prep calls can become expensive if UI is wired without per-user/job cache hygiene and rate limiting.
- Embedding workers poll for missing embeddings but live reads do not use vector search yet; batch/backfill and query strategy still need production design.
- Alert evaluator scans up to 500 new jobs per alert cycle and performs simple rule checks. This may not scale with many alerts/users.
- No operational dashboard for DLQ depth, pending messages, connector freshness, embedding coverage, alert delivery rate, or API latency.

## Remaining Work By Phase

### Phase 1 - Critical MVP Completion

Goal: make the existing MVP code buildable, testable, and truthful enough for a controlled demo with no privacy-critical broken flows.

| Task | Priority | Dependencies |
|---|---|---|
| Sync web dependencies and lockfile so `npm ci`, `npm run typecheck`, and build can resolve `openai` and `ioredis`. | P0 | None |
| Update CI database assertions from 13/17 to 16/21 and rerun CI locally where possible. | P0 | Current migrations |
| Fix `infra/docker/Dockerfile.web` invalid `COPY` instruction. | P0 | Current Next.js standalone output |
| Fix resume parser Storage path handling for uploaded `resumes/<userId>/<file>` objects. | P0 | Supabase Storage convention |
| Align resume file support: either remove `.doc/.rtf` from upload API or add extractor support. | P0 | Resume parser fix |
| Repair resume parser tests and ruff failures. | P0 | Parser import/mocking cleanup |
| Fix `/api/account` deletion: use `applications`, delete raw Storage objects, delete/anonymize internal user row, and order audit behavior intentionally. | P0 | Supabase auth/storage access |
| Update `/privacy` route so it matches current implementation and clearly labels remaining gaps. | P0 | Account/resume decisions |
| Add CSP/security headers and basic API rate limiting for expensive/sensitive routes. | P1 | Security policy choices |
| Wire quick-prep UI to `/api/quick-prep` or explicitly keep static content and label API as experimental. | P1 | Dependency lockfile fix |
| Reduce quick-prep prompt payload to spec-approved fields. | P1 | Quick-prep route |

### Phase 2 - Core Feature Expansion

Goal: complete the core MVP user promises beyond the demo shell.

| Task | Priority | Dependencies |
|---|---|---|
| Add resume parse-status API and UI state after upload. | P1 | Phase 1 resume parser fix |
| Build parsed-profile review/correction UI and persist corrected fields. | P1 | Parsed profile schema/UX |
| Wire web job-detail scoring to embeddings and/or parsed resume data. | P1 | Embedding workers, profile/resume data |
| Reconcile web 4-signal scoring and worker 7-signal scoring into one product contract. | P1 | Match-scoring decision |
| Replace active worker `XREAD` loops with consumer groups, `XACK`, retry, pending reclaim, and DLQ publishing. | P1 | Event bus helper tests |
| Verify and expose alert email delivery, including correct user-email lookup and delivery status updates. | P1 | Resend env, user identity model |
| Add tracked-company alert UX. | P2 | Alerts data model |
| Add application lifecycle states and update UI/API. | P2 | Applications schema migration |
| Build compare jobs flow or remove compare from MVP claims. | P2 | Product decision |
| Add admin/KPI dashboard for ingestion, embeddings, alerts, jobs, and errors. | P2 | Auth/RBAC decision |

### Phase 3 - UI/UX, Performance, And Scaling

Goal: prepare the MVP for beta-scale usage and investor/professor demos with credible operational proof.

| Task | Priority | Dependencies |
|---|---|---|
| Decide renderer direction: complete Globe.GL/deck.gl integration or write a new ADR accepting the custom React/CSS globe. | P2 | Product/design decision |
| Run Lighthouse and real-device mobile QA on staging. | P2 | Stable staging deployment |
| Complete human screen-reader pass with NVDA/VoiceOver/JAWS. | P2 | Stable user flows |
| Run k6 load test and store baseline artifacts. | P2 | Stable staging deployment |
| Add OpenTelemetry tracing and production dashboard. | P2 | Observability provider |
| Create worker runbooks, backup/restore runbook, and rollback runbook. | P2 | Deployment process |
| Replace or remove placeholder Terraform. | P3 | Infrastructure ownership |
| Calibrate matching from human review and behavioral signals. | P3 | Real usage data |
| Add CI-triggered staging deploy after tests pass. | P3 | Vercel/Railway secrets |

## Clear Next Sprint Recommendation

Start with the P0 build/test/privacy blockers in Phase 1. Do not build new AI features until the project can pass typecheck, migration validation, worker lint/tests, and the privacy-critical resume/account flows are correct.
