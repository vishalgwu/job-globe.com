# Remaining Work Phases

Last updated: 2026-05-01

This plan starts from the current verified baseline: production health is OK, `/api/jobs` reads from Supabase, Docker works locally, and CI/CD is passing. Items below are remaining work because the repo still contains placeholders, demo-mode APIs, or documented handoff gaps.

## Phase 3: Live Data Ingestion And Job Quality

Goal: replace manually loaded job data with repeatable worker-managed ingestion and verification.

Work left:

- Implement real source discovery connectors in `apps/workers`.
- Publish source fetch results through the Redis Streams boundary documented in `docs/architecture/agent-event-flow.md`.
- Implement job verification workers for live apply URLs, stale postings, and trust signals.
- Implement company identity resolution for domains, logos, and source confidence.
- Implement geo mapping for city, country, coordinates, and neighbourhood-level fields where available.
- Implement taxonomy attachment for function, level, remote mode, and job type.
- Implement duplicate detection and canonical merge behavior for repeated postings.
- Add worker dashboards or operational checks for queue lag, failed jobs, source freshness, and ingestion volume.
- Add tests around connector parsing, verification decisions, dedupe behavior, and canonical job writes.
- Update runbooks for source onboarding, source failure handling, and replaying ingestion safely.

Done when:

- New job records can be ingested without manual SQL seed loading.
- Bad or stale apply URLs are filtered or marked before reaching the user-facing API.
- Freshness targets in `docs/architecture/data-freshness-policy.md` are measurable.
- `/api/jobs` continues returning `source: "supabase"` from canonical job tables.

## Phase 4: Authenticated Profiles, Resume Handling, And Matching

Goal: turn onboarding and job matching from placeholder behavior into authenticated Supabase-backed product behavior.

Work left:

- Wire Supabase Auth sessions through the web app beyond the current route boundaries.
- Replace `/api/profile` demo-mode responses with authenticated profile reads and writes.
- Persist onboarding answers into the database.
- Implement authenticated saved jobs instead of session-only saved jobs.
- Implement private resume upload storage with the privacy rules in `docs/decisions/privacy-framework.md`.
- Implement resume parsing and structured extraction with confidence fields.
- Add deletion and retention behavior for raw resume files.
- Implement embeddings and profile/job matching after the model decision in `docs/decisions/ADR-004-embedding-model.md` is validated.
- Replace match placeholder content with real match explanations.
- Replace quick-prep placeholder content with profile-aware preparation output.
- Add tests for auth, profile validation, profile persistence, resume consent, and access control.

Done when:

- A signed-in user can complete onboarding and retrieve the same profile later.
- Resume handling follows the committed privacy policy.
- Job detail pages show real personalized match and quick-prep data.
- Unauthenticated users cannot read or modify private profile/resume data.

## Phase 5: Alerts, Applications, Observability, And Launch QA

Goal: finish user retention workflows and harden the app for broader production usage.

Work left:

- Replace `/api/alerts` placeholder behavior with saved-search alert subscriptions.
- Add alert delivery provider configuration and transactional email safeguards.
- Implement application tracking or application redirect history where the product requires it.
- Add production observability for health checks, API failures, worker failures, and migration mismatches.
- Add API smoke tests for `/api/health`, `/api/jobs`, `/api/profile`, and `/api/alerts`.
- Record Lighthouse performance values against production or staging.
- Run and record browser/device QA for Chrome, Firefox, Safari, iOS Safari, and responsive breakpoints.
- Run and record VoiceOver and NVDA QA.
- Finalize legal/privacy approval for resume consent copy before real resume processing is enabled.
- Review branch protection and prefer pull request flow for future production changes.

Done when:

- Users can save searches and receive alerts through the selected delivery channel.
- Operational failures have documented signals and runbook responses.
- Accessibility, performance, and device QA evidence is committed.
- Production changes follow the agreed GitHub/Vercel release process.
