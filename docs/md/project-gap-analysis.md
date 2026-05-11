# Project Gap Analysis

This gap analysis compares the implemented codebase against the reference plan in `docs/whole_project`.

## Feature Gaps

| Feature              | Current code                                                                                    | Gap                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Globe rendering      | Active React/CSS globe and fallback map exist.                                                  | Planned Globe.GL/deck.gl heatmap implementation is not active.                                                                 |
| Immersive intro      | `IntroOverlay` component exists.                                                                | It is not wired into the main page; audio/mute persistence is not implemented.                                                 |
| Application tracking | API, `/applications` page, and Apply CTA redirect recording exist.                              | Application lifecycle beyond `redirected` is not implemented.                                                                  |
| Resume parsing       | Upload, metadata, signed URL, and delete routes exist.                                          | PDF/DOCX parsing, structured extraction, confidence scoring, correction UI, and automated retention deletion are missing.      |
| Match scoring        | Rule-based scorer exists and can blend a supplied embedding score.                              | No embedding generation, pgvector retrieval, 7-component scoring engine, or calibration workflow is active.                    |
| Quick prep           | UI renders quick-prep fields from job detail.                                                   | No OpenAI generation or 24-hour per-user/job cache exists.                                                                     |
| Alerts               | CRUD routes and alerts page exist.                                                              | No scheduled evaluator, email delivery, digest bundling, or notification feed exists.                                          |
| Worker ingestion     | Connectors and pipeline workers are implemented in package code.                                | No repo evidence of live staging ingestion, webhook receiver, Redis consumer groups, dead-letter queue, or rate-limit buckets. |
| Privacy controls     | Consent copy, draft `/privacy` route, raw resume delete route, and selected audit writes exist. | Delete account, data export, parsed-profile correction, audit administration, and legal sign-off are missing.                  |
| Infrastructure       | Docker and CI exist.                                                                            | Terraform, staging deploy automation, production worker hosting, rollback docs, and observability dashboards are missing.      |

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
- Launch QA artifacts.

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

Priority: P0/P1.

Goal: make the current product internally consistent, privacy-safe enough for controlled demos, and CI-stable.

Tasks:

- Confirm Supabase environment variables and auth/session behavior in staging.
- Complete manual keyboard, screen-reader, mobile, and production performance QA evidence.
- Keep web tests, worker mypy, worker pytest, and migration validation green.
- Decide whether the draft `/privacy` route is enough for controlled demos or must point to an externally reviewed policy.

Dependencies:

- Supabase staging project and service-role configuration.
- Product/legal decision on whether `/privacy` should remain an app page or become an external policy URL.
- Manual QA owner for keyboard, screen-reader, mobile, and production performance evidence.

### Phase 2 - Feature Expansion

Priority: P1/P2.

Goal: implement the planned AI and alert features that are currently schema/UI placeholders.

Tasks:

- Build resume parsing worker for PDF/DOCX/TXT and store structured extraction with confidence values.
- Add user correction UI for parsed profile fields.
- Generate and store job/profile embeddings.
- Implement pgvector candidate retrieval and the planned 7-component scoring formula.
- Replace placeholder quick-prep content with generated/cached content.
- Implement alert evaluator, in-app notifications, email delivery, daily caps, and digest bundling.
- Add webhook receivers and source-specific rate-limit handling.
- Add Redis consumer groups, acknowledgements, retries, and dead-letter queue handling.

Dependencies:

- OpenAI key/model decision and privacy approval for prompt data scope.
- Transactional email provider.
- Worker deployment target with Redis/PostgreSQL access.
- Source credentials for the selected live connectors.

### Phase 3 - Optimization And Scaling

Priority: P2/P3.

Goal: make the system measurable, scalable, and launch-ready.

Tasks:

- Replace Terraform placeholders with real modules or remove Terraform from the active infrastructure story.
- Define production worker deployment and rollback process.
- Add OpenTelemetry or equivalent distributed tracing across web and workers.
- Build internal KPI/admin dashboard.
- Add load tests for job queries and worker replay tests.
- Add backup/restore and incident response runbooks.
- Complete mobile/device QA, Lighthouse budgets, accessibility reports, and security testing.
- Calibrate match scoring from behavioral signals and human review sets.

Dependencies:

- Production hosting choices for web, workers, Redis, Postgres, storage, and observability.
- Real usage data or a representative staging replay dataset.
- Security/privacy review owner.

## Clear Next Steps

1. Confirm staging Supabase variables, `/api/health`, and `/api/auth/session`.
2. Complete manual keyboard, screen-reader, mobile, and production performance QA evidence.
3. Decide alert delivery scope for the next release.
4. Start resume parsing only after privacy copy and data-processing scope are approved.
