# Vercel Deployment Verification

This runbook verifies the production deployment after changes land on `main`.

Last verified: 2026-05-01. Production `/api/health` returned HTTP 200 with `environment`, `supabase.jobs`, and `supabase.migrations` checks passing.

## Production Target

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| Vercel project    | `job-globe-com-web`                               |
| Owner             | `vishalgwu`                                       |
| Production URL    | `https://job-globe-com-web.vercel.app/`           |
| Health URL        | `https://job-globe-com-web.vercel.app/api/health` |
| Production branch | `main`                                            |
| App path          | `apps/web`                                        |
| Build command     | `npm --workspace apps/web run build`              |

## Pre-Deploy Checks

Run these locally before pushing:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run migration:check
.\.venv-job-globe\Scripts\python.exe -m ruff check apps\workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps\workers\src
.\.venv-job-globe\Scripts\python.exe -m pytest -p no:cacheprovider apps\workers\tests
```

## Deployment Path

1. Merge or push the verified commit to `main`.
2. Vercel deploys `job-globe-com-web` from `main`.
3. Confirm Vercel reports the deployment status as `Ready`.
4. Confirm the production URL returns HTTP 200.

```powershell
Invoke-WebRequest -Uri "https://job-globe-com-web.vercel.app/" -UseBasicParsing
Invoke-WebRequest -Uri "https://job-globe-com-web.vercel.app/api/health" -UseBasicParsing
```

Expected `/api/health` result:

- top-level `status` is `ok`
- `environment` check is `ok`
- `supabase.jobs` check is `ok`
- `supabase.migrations` check is `ok`

## Supabase Migration Step

Before or immediately after deployment, apply migrations with history tracking:

```bash
DATABASE_URL="<supabase-pooler-url>" python packages/database/scripts/apply_migrations.py packages/database/migrations
```

The script creates `schema_migrations`, records each migration checksum, skips already-applied migrations, and fails if a previously applied migration file changes.

## Rollback

Use Vercel's deployment list for `job-globe-com-web`:

1. Open the Vercel project.
2. Go to Deployments.
3. Select the last known-good production deployment.
4. Use Promote to Production.
5. Verify `/` and `/api/health` return HTTP 200.

If the rollback is caused by a database migration, do not manually mutate production data. Create a forward migration that restores the expected schema/data state, run it through `apply_migrations.py`, and record the incident in the project notes.
