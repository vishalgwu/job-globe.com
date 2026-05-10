# Jobs and Health API

Source of implementation:

- `apps/web/app/api/jobs/route.ts`
- `apps/web/app/api/health/route.ts`
- `apps/web/lib/jobs/supabaseJobs.ts`
- `apps/web/lib/jobs/filters.ts`

## Current Status

Implemented:

- `GET /api/jobs?mode=global`
- `GET /api/jobs?mode=country`
- `GET /api/jobs?mode=city`
- `GET /api/jobs?mode=jobs`
- `GET /api/jobs?mode=detail&id=<job-id>`
- `GET /api/health`

## Query Filters

Supported filters:

- `category`
- `country`
- `city`
- `remote`
- `jobType`
- `postedWithin`
- `q` or `query`

If `postedWithin` is omitted, no time filter is applied.

## Jobs Modes

`mode=global` returns country-level job density.

`mode=country` returns country and city rollups.

`mode=city` returns company bubbles and job markers.

`mode=jobs` returns filtered job summaries.

`mode=detail&id=<job-id>` returns a single job detail. If the user is authenticated and has a profile, the route can include personalized match scoring.

All successful responses use `source: "supabase"`.

## Health Check

`GET /api/health` verifies:

- environment configuration
- Supabase jobs table reachability
- Supabase migration history table reachability
- Supabase auth reachability
- Supabase storage reachability

Healthy response status is HTTP 200. Any failed check returns HTTP 503.

See `docs/md/API.md` and `docs/md/PROJECT_STATUS.md` for module-level status.
