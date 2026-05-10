# Remaining Work Phases

Last updated: 2026-05-10

This plan starts from the current verified baseline: production health is OK, `/api/jobs` reads from Supabase, Docker works locally, and CI/CD is passing. Items below are remaining work because the repo still contains placeholders, demo-mode APIs, or documented handoff gaps.

## Phase 3: Live Data Ingestion And Job Quality ✅ COMPLETE

Goal: replace manually loaded job data with repeatable worker-managed ingestion and verification.

All Phase 3 work is complete as of 2026-05-09. See `docs/project-status/achieved-to-date.md` for the full list of what was built. The worker pipeline is now fully implemented: discovery → verification → company identity → geo mapping → taxonomy tagging → canonical merge. All seven source connectors are implemented with tests. Three operational runbooks were written.

## Phase 4: Authenticated Profiles, Resume Handling, And Matching ✅ COMPLETE

Goal: turn onboarding and job matching from placeholder behavior into authenticated Supabase-backed product behavior.

All Phase 4 work is complete as of 2026-05-09. See `docs/project-status/achieved-to-date.md` for the full list of what was built.

## Phase 5: Alerts, Applications, Observability, And Launch QA ✅ COMPLETE (core implementation)

Goal: finish user retention workflows and harden the app for broader production usage.

### Completed (2026-05-10)

- `/api/alerts` — GET / POST / DELETE / PATCH (pause/resume). Backed by `alerts` table, daily-max guard, full input validation.
- Alerts page — functional UI with create, list, pause/resume, delete.
- `/api/applications` — GET / POST. Records apply redirect history. Backed by `applications` table.
- Applications page — lists redirect history with domain, date, status, re-open link.
- `/api/health` expanded — added `supabase.auth` and `supabase.storage` checks, `durationMs`.
- Structured JSON logger (`lib/observability/logger.ts`) + in-process metrics (`lib/observability/metrics.ts`).
- Smoke test suite (`__tests__/smoke-api.test.ts`) — 18 tests covering all key route contracts.
- Lighthouse baseline doc, browser/device QA doc, accessibility QA doc.
- Privacy consent approval tracking doc.
- Branch protection and release process doc.

### Pending before full production sign-off

- Record real Lighthouse scores against production URL (`docs/qa/phase-5-lighthouse-baseline.md`).
- Complete browser/device QA across the full 6-entry matrix (`docs/qa/phase-5-browser-device-qa.md`).
- Complete VoiceOver, NVDA, and keyboard nav QA (`docs/qa/phase-5-accessibility-qa.md`).
- Obtain Legal/Privacy sign-off on resume consent copy (`docs/decisions/privacy-consent-approval.md`).
- Enable branch protection rules on `main` in GitHub Settings.
- Configure `TRANSACTIONAL_EMAIL_API_KEY` and enable email alert delivery.

### Deferred (separate future milestones)

- Resume NLP parsing — structured field extraction with confidence values. Storage and retention pipeline are complete; the parser is a Phase 6 enrichment step.
- Embedding-based match scoring — `profile_embeddings` / `job_embeddings` tables exist; deferred per ADR-004 until the model decision is validated in production.

Done when:

- All pending sign-off items above are completed and documented.
- Real Lighthouse, browser, and accessibility QA evidence is committed.
- Production changes follow the branch-protection + PR flow.
