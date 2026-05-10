# Achieved To Date

Last updated: 2026-05-09

This file records only work that is visible in the repository, verified through local commands, or verified through the live production endpoints. It does not include secrets.

## Verified Baseline

- The repository is on `main` and is pushed to GitHub.
- The private root `.env` file is ignored by Git.
- The current Node baseline uses `npm` and `package-lock.json`.
- Root scripts exist for local development, lint, typecheck, build, migration validation, and migration application.
- Docker Compose starts PostgreSQL 15 with pgvector, Redis 7, the web app, and workers from `infra/docker/docker-compose.dev.yml`.
- CI runs web lint, typecheck, build, worker checks, worker tests, and database migration validation.

## Supabase

- Supabase project metadata is recorded in `docs/setup/deployment-inventory.md`.
- Project name: `job-globe-staging`.
- Project ref: `mqfiocolakvqkpvxlafk`.
- Project URL: `https://mqfiocolakvqkpvxlafk.supabase.co`.
- Region: `us-east-1`.
- PostgreSQL pooler metadata is recorded without passwords.
- All SQL migrations have been run against Supabase staging.
- Migration history is tracked in `public.schema_migrations`.
- The production health check verifies 12 migration records.
- The production health check verifies 200 active job records are reachable.

## Web And APIs

- The production web app is deployed at `https://job-globe-com-web.vercel.app/`.
- `/api/health` is the canonical health endpoint for Docker, Vercel, and Supabase checks.
- Production `/api/health` returns HTTP 200 with:
  - `environment=ok`
  - `supabase.jobs=ok`
  - `supabase.migrations=ok`
- `/api/jobs` reads from Supabase and returns `source: "supabase"`.
- `/api/jobs?mode=global` returns country-level data from Supabase.
- `/api/jobs?mode=jobs` returns job list data from Supabase.
- `/api/jobs?mode=detail&id=<job-id>` returns one Supabase-backed job detail record.
- The Jobs API contract is documented in `docs/api/jobs-api.md`.

## Product Surface

- The main globe route exists as an interactive app surface.
- Global, country, city, and neighbourhood layer states exist in the UI.
- Search and filters call the Jobs API.
- Job detail panel, apply CTA, save CTA, match placeholder, and quick-prep placeholder exist.
- Onboarding UI exists with profile questions and a resume upload placeholder.
- Anonymous saved jobs use browser session storage.

## Deployment And Verification

- Vercel project: `job-globe-com-web`.
- Vercel owner: `vishalgwu`.
- Production branch: `main`.
- Vercel production deployment is successful.
- The previous production blocker for `NEXT_PUBLIC_SUPABASE_URL` is resolved.
- GitHub Actions CI passed for application commit `8318734`.
- Vercel reported success for application commit `8318734`.
- Vercel verification and rollback steps are documented in `docs/runbooks/vercel-deployment.md`.

## Phase 3: Live Data Ingestion (Completed 2026-05-09)

- **Abstract connector base** (`agents/discovery/connectors/base.py`) with retry, back-off, and rate-limit handling shared across all connectors.
- **Seven source connectors** implemented with full normalisation logic:
  - Greenhouse (public board API, no auth required per company token)
  - Lever (public postings API, no auth required per company slug)
  - Adzuna (search API, requires `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`)
  - USA Jobs (federal jobs API, requires `USAJOBS_API_KEY`)
  - EURES (EU jobs portal, no auth required)
  - Workable (company subdomain API, optional token)
  - SmartRecruiters (public company postings API, no auth required)
- **Discovery runner** (`agents/discovery/runner.py`) respects freshness rules from `scheduler.py`, records `agent_runs` rows, and publishes `RawJobEvent` payloads to the `job-globe.discovery` Redis stream.
- **Verification worker** (`agents/verification/worker.py`) — HTTP HEAD-checks every apply URL, stamps `verified_live_at`, and filters dead URLs before forwarding downstream.
- **URL trust scoring** — `url_checker.py` computes 0–1 trust scores based on HTTPS, ATS domain recognition, and redirect depth.
- **Company identity resolver** (`agents/company_identity/resolver.py`) — domain extraction, Clearbit logo API, trust score computation, upsert into `companies` table.
- **Geo mapper** (`agents/geo_mapping/geocoder.py`) — covers ~200 global city centroids plus pycountry country-level fallbacks; upserts into `locations` table; no external API dependency in the hot path.
- **Taxonomy tagger** (`agents/categorisation/tagger.py`) — rule-based classification of function, seniority, remote_type, employment_type; writes `job_taxonomy_links` with per-match confidence scores.
- **Duplicate detector + canonical merge** (`agents/duplicate_detection/detector.py`) — skill extraction, fingerprinting, upserts `jobs_canonical` with full enrichment in a single idempotent write.
- **Shared Python types** (`packages/shared-types/python/`) — `RawJobEvent`, `CanonicalJob`, `Location`, `LocationInput`, `Company`, `CompanyInput` Pydantic models matching the DB schema.
- **DB repository layer** — typed repositories for `jobs_raw`, `jobs_canonical`, `companies`, `locations`, `job_taxonomy`, `agent_runs`; all writes are idempotent.
- **Observability health module** (`observability/health.py`) — queue depth per stream, source freshness age, 24-hour ingestion summary; logs on 5-minute interval.
- **Main entrypoint** (`main.py`) — multi-threaded, SIGTERM-aware, graceful shutdown, replaces placeholder runtime.
- **86 tests passing** (36 new Phase 3 tests + pre-existing suite) covering connectors, geo mapping, taxonomy classification, duplicate detection, URL checking, company trust scoring, and freshness rules. Full suite runs in under 0.5 s with zero failures.
- **Three runbooks** — source onboarding, source failure handling, ingestion replay.
- **Settings extended** with all connector credentials, stream names, and HTTP tuning parameters.

## Phase 4: Authenticated Profiles, Resume Handling, And Matching (Completed 2026-05-09)

- **Browser Supabase client** (`lib/supabase/client.ts`) — `createBrowserSupabaseClient()` using the anon key for client-component auth flows.
- **`/api/auth/session`** — fixed from a hardcoded stub to a real resolver: returns `{ authenticated, userId, email, hasProfile }` using the cookie-based Supabase session.
- **`/api/auth/refresh`** — implemented: calls `supabase.auth.refreshSession()` from the SSR client.
- **Login page** (`app/(auth)/login/page.tsx`) — full Supabase `signInWithPassword` form with error handling and post-login redirect.
- **Register page** (`app/(auth)/register/page.tsx`) — full Supabase `signUp` form with password confirmation, email confirmation flow, and redirect to onboarding.
- **Profile page** (`app/(profile)/profile/page.tsx`) — loads `/api/auth/session`, `/api/profile`, and `/api/resume` on mount; displays all onboarding preferences, resume status with signed-URL view link, and a raw-file delete action per the privacy policy.
- **Saved jobs page** (`app/(profile)/saved/page.tsx`) — lists saved jobs from `/api/saved-jobs` with job cards, location, employment type, apply link, and remove action.
- **Real match scoring in job detail** — `/api/jobs?mode=detail` now calls `resolveRequestUser` → loads `profiles` row → passes `OnboardingAnswers` to the new `getJobDetailWithProfile()` function. Authenticated requests get a live `MatchBreakdown` from `ruleBasedScore` + `buildMatchBreakdown`. Unauthenticated requests still receive the graceful placeholder.
- **Profile-aware quick prep** — `getJobDetailWithProfile()` computes `skillsIHave` / `skillsMissing` by comparing job `required_skills` against role-family-implied skills, generates role-specific interview questions, and produces a personalised resume tailoring note.
- **Authenticated saved jobs store** (`stores/jobStore.ts`) — `hydrateSavedJobs` checks `/api/auth/session` on mount and syncs with `/api/saved-jobs` for authenticated users; falls back to session storage for anonymous users. `toggleSavedJob` calls POST / DELETE on the API when authenticated.
- **Resume upload wired** (`components/onboarding/ResumeUpload/ResumeUpload.tsx`) — POSTs to `/api/resume` with `FormData` when the user grants consent; shows upload progress, success with retention date, and error states. Gracefully skips upload for unauthenticated users.
- **Onboarding success message** — `OnboardingFlow` now shows "Profile saved to your account." vs "Profile saved in demo mode." based on the `mode` field returned by `/api/profile POST`.
- **Vitest test suite** (`__tests__/`) — 3 test files covering match scorer pure functions (`cosineSimilarity`, `ruleBasedScore`, `buildMatchBreakdown`, `buildSummary`), profile validation logic (all field rules, consent normalisation), and auth-guard contracts (session shape, 401 guard pattern). Vitest added to `package.json` and CI.

## Explicitly Not Complete Yet

- `/api/alerts` is still a placeholder.
- Application tracking and redirect history are not implemented.
- Production observability, health-check smoke tests, Lighthouse scores, and browser/device QA are not recorded.
- VoiceOver and NVDA accessibility QA evidence is not committed.
- Resume NLP parsing (structured field extraction with confidence values) is deferred — the storage and retention pipeline is complete; the parser is a Phase 5 enrichment step.
- Embedding-based match scoring (`profile_embeddings` / `job_embeddings` tables) is deferred per ADR-004 until the model decision is validated in production.
