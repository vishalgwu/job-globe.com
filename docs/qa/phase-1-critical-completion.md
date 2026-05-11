# Phase 1 Critical Completion QA Evidence

Updated: 2026-05-11

This file records evidence captured during the Phase 1 completion pass. It does not claim public-launch sign-off.

## Environment And Staging Configuration

Root `.env` check:

- `NEXT_PUBLIC_SUPABASE_URL`: present with value.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: present with value.
- `SUPABASE_SERVICE_ROLE_KEY`: present with value.
- `SESSION_COOKIE_NAME`: present with value `job_globe_session`.
- `SESSION_COOKIE__NAME`: not present. The codebase uses `SESSION_COOKIE_NAME`, so no double-underscore key is required.

Live health check after loading `.env` into the Next.js process:

- `GET /api/health`: 200.
- Environment check: ok.
- Supabase jobs check: ok, 200 active job records reachable.
- Supabase migrations check: ok, 14 migration records tracked.
- Supabase auth check: ok.
- Supabase storage check: ok.

Staging corrections completed during this pass:

- Applied checked-in migration `013_profiles_preferences.sql`; staging had only 12 migration records before this run.
- Added and applied `014_resume_extractions_user_unique.sql` so `/api/resume` can safely upsert one resume row per user.
- Created private Supabase Storage bucket `resumes`; staging had no storage buckets before this run.

## Authenticated Staging Flow

Executed against the local Next.js server connected to staging Supabase:

- Register/login: passed through Supabase admin-created test user, then password login.
- App session: `GET /api/auth/session` returned authenticated state.
- Save profile: `POST /api/profile` passed.
- Upload resume: `POST /api/resume` passed using a text fixture with no real personal data.
- Delete raw resume: `DELETE /api/resume` passed.
- Save job: `POST /api/saved-jobs` passed.
- Apply click record: `POST /api/applications` passed before external redirect behavior.
- Confirm application record: `GET /api/applications?limit=10` returned the new application.
- Create/delete alert: `POST /api/alerts` and `DELETE /api/alerts?id=...` passed.

Evidence IDs from the passing run:

- Internal user: `a4a24d73-e4c6-4146-9fe8-79797d945306`.
- Auth user: `6ddd18d6-503e-4ae1-afd4-18a7bdb8c854`.
- Job: `744fb0c8-b405-48ba-8400-92a0bd047578`.
- Application: `1cfbd962-0759-49c5-a431-b200c62b01ed`.
- Deleted alert: `b5676c11-79a9-4c31-b10d-0dc78d8d0417`.

Confirmed `audit_events` rows for that user:

- `profile.updated`: 1.
- `resume.uploaded`: 1.
- `resume.raw_deleted`: 1.
- `saved_job.created`: 1.
- `application.redirected`: 1.
- `alert.created`: 1.
- `alert.deleted`: 1.

Worker failure audit writes are implemented in code, but this QA run did not intentionally trigger a worker failure in staging.

## Browser, Accessibility, Mobile, And Performance Evidence

Artifacts:

- `docs/qa/artifacts/home-1440x900.png`.
- `docs/qa/artifacts/privacy-1440x900.png`.
- `docs/qa/artifacts/home-mobile-390x844.png`.
- `docs/qa/artifacts/privacy-mobile-390x844.png`.
- `docs/qa/artifacts/phase1-browser-evidence.json`.
- `docs/qa/artifacts/phase1-production-performance.json`.

Headless Chrome QA evidence:

- Keyboard traversal passed for `/` and `/login`; `/privacy` is static and has no tabbable controls.
- Chrome accessibility tree check passed for `/`, `/privacy`, and `/login`.
- No empty-name interactive controls were reported by the Chrome accessibility tree on those routes.
- Mobile viewport screenshots were captured at 390x844 for `/` and `/privacy`.
- Basic performance timing passed on the env-loaded dev server:
  - `/`: load event 127 ms, first contentful paint 236 ms.
  - `/privacy`: load event 149 ms, first contentful paint 112 ms.
- Basic performance timing passed on `next start` production build connected to staging Supabase:
  - `/`: load event 124 ms, first contentful paint 136 ms.
  - `/privacy`: load event 34 ms, first contentful paint 52 ms.

Screen-reader note:

- This run used Chrome's accessibility tree as a screen-reader proxy. A human NVDA/JAWS/VoiceOver pass is still recommended before public launch.

## Local Code Checks

Passed in this phase before the staging flow:

- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- `npm run test --workspace=apps/web`.
- `.\.venv-job-globe\Scripts\python.exe -m ruff check apps/workers`.
- `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src`.
- `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests`.
- `python packages/database/scripts/validate_migrations.py packages/database/migrations`.

Latest known results:

- Web tests: 5 files, 48 tests passed.
- Worker mypy: 45 source files passed.
- Worker pytest: 86 tests passed.
- Migration validation after migration 014: 14 files, 17 tables, pgvector, GIN indexes, and resume uniqueness present.
- Production build includes `/privacy`.

## Privacy Product Decision

Decision for controlled demos:

- Keep the current draft `/privacy` route for controlled demos.
- The route is acceptable because it accurately labels itself as a non-final notice and describes only implemented behavior.

Limit:

- `/privacy` is not a reviewed legal policy and must be replaced or legally reviewed before public launch, broad beta, or production handling of real resume data at scale.
