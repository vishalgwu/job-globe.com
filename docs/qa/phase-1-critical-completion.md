# Phase 1 Critical Completion QA Evidence

Updated: 2026-05-11

This file records evidence captured during the Phase 1 local completion pass. It does not claim staging or launch sign-off.

## Local Code Checks

Passed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test --workspace=apps/web`
- `.\.venv-job-globe\Scripts\python.exe -m mypy apps/workers/src`
- `.\.venv-job-globe\Scripts\python.exe -m pytest apps/workers/tests`
- `python packages/database/scripts/validate_migrations.py packages/database/migrations`

Latest observed results:

- Web tests: 5 files, 48 tests passed.
- Worker mypy: 45 source files passed.
- Worker pytest: 86 tests passed.
- Migration validation: 13 files, 17 tables, pgvector, and GIN indexes present.
- Production build includes `/privacy`.

## Local Browser Smoke

Server:

- `npm --workspace apps/web run dev -- --hostname 127.0.0.1 --port 3000`

HTTP checks:

- `GET /`: 200
- `GET /privacy`: 200
- `GET /api/auth/session`: 200 with `{"authenticated":false}`
- `GET /api/health`: 503 because local shell did not provide Supabase server environment variables.

Headless Chrome screenshots:

- `docs/qa/artifacts/home-1440x900.png`
- `docs/qa/artifacts/privacy-1440x900.png`

Observation:

- `/privacy` renders the draft privacy notice.
- `/` renders the app shell and globe UI.
- The job API returns 500 locally without Supabase server configuration, which matches the current code path.

## Supabase Staging Confirmation

Not completed in this local pass.

The local shell did not expose these variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_COOKIE_NAME`

Required staging confirmation:

- Configure staging Supabase URL, anon key, service-role key, and session cookie name.
- Run `/api/health` and verify environment, jobs, migrations, auth, and storage checks.
- Run `/api/auth/session` unauthenticated and authenticated.
- Complete one authenticated profile save, resume upload/delete, save job, apply click, alert create/delete, and confirm audit rows.

## Accessibility And Performance Evidence

Captured:

- Basic browser render screenshots at 1440x900.
- The CSS has visible focus styling through `:focus-visible`.

Not yet captured:

- Manual keyboard navigation pass.
- Screen-reader pass.
- Mobile-device pass.
- Lighthouse or equivalent production performance report.
- Authenticated end-to-end browser flow against staging.
