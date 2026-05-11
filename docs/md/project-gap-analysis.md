# Project Gap Analysis

This gap analysis compares the implemented codebase against the reference plan in `docs/whole_project`.

## Feature Gaps

| Feature              | Current code                                                                                                                   | Gap                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Globe rendering      | Active React/CSS globe and fallback map exist.                                                                                 | Planned Globe.GL/deck.gl heatmap implementation is not active.                                                                 |
| Immersive intro      | `IntroOverlay` component exists.                                                                                               | It is not wired into the main page; audio/mute persistence is not implemented.                                                 |
| Application tracking | API, `/applications` page, and Apply CTA redirect recording exist.                                                             | Application lifecycle beyond `redirected` is not implemented.                                                                  |
| Resume parsing       | Upload, metadata, signed URL, and delete routes exist.                                                                         | PDF/DOCX parsing, structured extraction, confidence scoring, correction UI, and automated retention deletion are missing.      |
| Match scoring        | Rule-based scorer exists and can blend a supplied embedding score.                                                             | No embedding generation, pgvector retrieval, 7-component scoring engine, or calibration workflow is active.                    |
| Quick prep           | UI renders quick-prep fields from job detail.                                                                                  | No OpenAI generation or 24-hour per-user/job cache exists.                                                                     |
| Alerts               | CRUD routes and alerts page exist.                                                                                             | No scheduled evaluator, email delivery, digest bundling, or notification feed exists.                                          |
| Worker ingestion     | Connectors and pipeline workers are implemented in package code.                                                               | No repo evidence of live staging ingestion, webhook receiver, Redis consumer groups, dead-letter queue, or rate-limit buckets. |
| Privacy controls     | Consent copy, draft `/privacy` route, raw resume delete route, selected audit writes, and private staging resume bucket exist. | Delete account, data export, parsed-profile correction, audit administration, and legal sign-off are missing.                  |
| Infrastructure       | Docker and CI exist.                                                                                                           | Terraform, staging deploy automation, production worker hosting, rollback docs, and observability dashboards are missing.      |

## Missing Components

- Background alert evaluator and delivery pipeline.
- Resume parse worker for PDF/DOCX and structured profile extraction.
- Embedding generation jobs for `job_embeddings` and `profile_embeddings`.
- User-facing parsed profile correction flow.
- Self-service account deletion and data export.
- Audit-event reporting, retention policy, admin access controls, and complete event coverage.
- Webhook receivers for ATS sources.
- Redis consumer groups, message acknowledgement, retries, and dead-letter queue handling.
- Production worker deployment definition.
- Real Terraform/cloud infrastructure.
- Full launch QA artifacts beyond the Phase 1 controlled-demo smoke evidence.

## Technical Debt

- `useAlerts()` and `useMatchScore()` are empty hooks.
- The root `apps/jarvis-job-globe` static prototype remains in the repo as reference material but is not part of the production Next.js app.
- Some code comments and demo strings still refer to older phase/placeholder language.
- The database schema is ahead of implementation for embeddings and some compliance workflows.
- Terraform files are placeholders but still part of the infrastructure tree.

## Risks And Blockers

- Privacy risk: resume upload exists before account deletion, export, correction workflows, and legal/privacy sign-off.
- Operational risk: worker code exists, but production deployment and live-run evidence are not captured in the repo.
- Data quality risk: live source ingestion lacks repo-visible rate-limit buckets, dead-letter handling, and provenance display in the web UI.
- AI trust risk: match UI exists, but semantic scoring and resume-derived profile data are not implemented.

## Remaining Work By Phase

### Phase 1 - Critical Completion

Phase 1 controlled-demo gate closed on 2026-05-10. Remaining before any public launch:

- Human screen-reader pass (no automated substitute).
- Legal/privacy policy approval or replacement with a reviewed external policy (the current `/privacy` route is a draft).
- Security review sign-off.
- Broader production QA: Lighthouse budgets, real mobile devices, load baseline.

Dependencies: legal/privacy reviewer, security review owner, production QA owner.

### Phase 2 - Feature Expansion

Goal: activate the AI, alert, and privacy self-service features that are currently schema or UI placeholders.

Phase 2 is blocked until Phase 1 legal/privacy approval is complete for resume and profile data handling.

### Phase 3 - Optimization And Scaling

Goal: production-grade infrastructure, observability, and launch hardening.

---

## Step-By-Step Remaining Work Plan

This plan is derived directly from code gaps confirmed on 2026-05-10. Items are ordered by dependency and risk.

### Step 1 — Pre-Launch Blockers (P0)

These must be resolved before any public traffic:

- Conduct human screen-reader accessibility pass on the full web app flow.
- Obtain legal/privacy sign-off on the `/privacy` policy and resume data handling scope.
- Complete security review covering auth routes, Supabase RLS, Storage bucket policy, and worker egress.
- Wire `IntroOverlay` component (`apps/web/components/globe/IntroOverlay/IntroOverlay.tsx`) into `GlobeExperience` — it is built but not imported anywhere.

### Step 2 — Technical Debt Cleanup (P1)

Fix stubs and placeholders that break the user-facing product silently:

- Implement `useAlerts()` hook (`apps/web/hooks/useAlerts.ts`) — currently `return {}`.
- Implement `useMatchScore()` hook (`apps/web/hooks/useMatchScore.ts`) — currently `return {}`.
- Replace `packages/shared-types/python/profile.py` and `match.py` placeholder strings with real Pydantic models matching the TypeScript contracts in `packages/shared-types/typescript/`.
- Connect `deploy-staging.yml` to a real staging platform and remove the echo-only placeholder step.
- Remove or replace Terraform placeholder files (`infra/terraform/main.tf` is a single `# TODO` comment). Either add real modules or delete the directory and update docs accordingly.

### Step 3 — Resume Parsing Worker (P1, requires Step 1 legal approval)

- Extend `apps/workers/src/job_globe_workers/parsers/resume_extractor.py` to handle PDF (via `pypdfium2`, already installed) and DOCX (via `python-docx`).
- Build a structured extraction layer that produces a normalised profile object (skills, title, seniority, locations) with per-field confidence values.
- Store extraction results in the `resume_extractions` table (migration 014 already enforces one row per user).
- Add user-facing correction UI for parsed profile fields in `apps/web/app/(profile)/profile/`.
- Add an automated raw-file deletion job after the retention window expires.

### Step 4 — Embeddings And Semantic Matching (P1, requires Step 3)

- Build an embedding generation job in `apps/workers/src/job_globe_workers/` that writes vectors to `job_embeddings` and `profile_embeddings` (both tables exist in migrations 007).
- Implement pgvector ANN retrieval in `apps/web/lib/match/scorer.ts` — the cosine blend path is already coded but the embedding rows are never populated.
- Upgrade `apps/workers/src/job_globe_workers/scoring/match_engine.py` from the current 3-signal engine to the planned 7-component scorer (skill overlap, seniority, location, remote, employment type, role family, salary range).
- Replace placeholder quick-prep content in `components/job-panel/QuickPrepToolkit` with OpenAI-generated content stored in a per-user/job cache with a 24-hour TTL.

### Step 5 — Alert Delivery Pipeline (P1)

- Build a background alert evaluator worker under `apps/workers/src/job_globe_workers/` that runs on a schedule, queries `jobs_canonical` against saved alert criteria, and produces match events.
- Add a `notification_feed` table (or extend `audit_events`) for in-app notifications.
- Integrate a transactional email provider (decision pending) for alert email delivery with daily caps and digest bundling.
- Implement the alert delivery history table to track send status and suppression.

### Step 6 — Worker Hardening (P2)

- Add Redis consumer group support and explicit message acknowledgement to the event bus (`apps/workers/src/job_globe_workers/event_bus/consumer.py`).
- Implement retry logic with exponential back-off and a dead-letter stream for failed messages.
- Add webhook receiver endpoints for Greenhouse and Lever push events.
- Add per-source rate-limit bucket enforcement in the discovery connectors (`apps/workers/src/job_globe_workers/agents/discovery/connectors/base.py` already has retry back-off; rate-limit token buckets are missing).
- Add live staging ingestion evidence (currently no repo-visible proof of a live multi-source run).

### Step 7 — Privacy Self-Service (P1, requires Step 1 legal approval)

- Implement `DELETE /api/account` route that removes all user data across `users`, `profiles`, `resume_extractions`, `saved_jobs`, `job_applications`, `job_alerts`, and Supabase Storage.
- Implement `GET /api/account/export` that returns a GDPR-style JSON data export.
- Extend audit event coverage to all tables and all user-triggered events beyond the Phase 1 set.
- Add audit retention policy and an admin access control layer.

### Step 8 — Infrastructure And Observability (P2)

- Define production worker deployment target (container service, VM, or serverless) and write a rollback runbook.
- Add OpenTelemetry trace instrumentation across `apps/web` and `apps/workers/src/job_globe_workers/observability/tracing.py` (currently a stub).
- Build an internal KPI/admin dashboard surfacing job ingestion counts, match score distributions, alert delivery rates, and error rates.
- Add backup/restore procedure for the production PostgreSQL instance.
- Write incident response runbook referencing the observability stack.

### Step 9 — Launch Hardening (P2/P3)

- Run Lighthouse CI with a defined performance budget against the production URL.
- Execute load tests for the `/api/jobs` route under realistic concurrent user counts.
- Run worker replay tests against a representative job dataset.
- Calibrate match scoring weights from behavioral click-through signals and human review sets.
- Complete full real-device mobile QA beyond the Phase 1 mobile viewport smoke screenshots.

---

## Clear Next Steps

1. Assign a legal/privacy reviewer before any public-facing work on resume parsing or account data export.
2. Fix `useAlerts()` and `useMatchScore()` stubs immediately — they silently do nothing in the current deployed app.
3. Wire `IntroOverlay` into `GlobeExperience` or delete the component to avoid dead code.
4. Decide alert delivery scope (in-app only vs. email) before starting Step 5.
5. Choose production hosting for workers before starting Steps 6–8.
6. Resume parsing (Step 3) and embedding generation (Step 4) require OpenAI key and privacy approval — do not start without both.
