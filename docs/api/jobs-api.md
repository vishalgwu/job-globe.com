# Jobs API

`GET /api/jobs` returns Supabase-backed job data from the staging/production schema. The route reads from `jobs_canonical` and related company, location, and taxonomy tables, then returns payloads that match the shared TypeScript contracts in `packages/shared-types/typescript`.

The route requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment. The `source` field is `supabase` for all successful responses.

`GET /api/health` is the canonical health endpoint for Docker, Vercel, and Supabase checks. It verifies required Supabase environment variables, active job table reachability, and migration history table reachability.

## Query Modes

All modes accept optional filters:

| Query          | Values                                              |
| -------------- | --------------------------------------------------- |
| `category`     | Taxonomy value, such as `software-engineering`      |
| `country`      | ISO-like country code, such as `US`                 |
| `city`         | City name                                           |
| `remote`       | `remote`, `hybrid`, `on-site`                       |
| `jobType`      | `internship`, `new-grad`, `full-time`, `contract`   |
| `postedWithin` | `1hr`, `6hr`, `1day`, `7day`, `past-month`          |
| `q` or `query` | Free-text search                                    |

If `postedWithin` is omitted, the API behaves as `any-time` and does not apply a time filter.

### `mode=global`

Returns country-level job density for the globe heat layer.

```json
{
  "mode": "global",
  "source": "supabase",
  "filters": {},
  "countries": []
}
```

### `mode=country`

Returns a country summary plus city-level rollups.

```json
{
  "mode": "country",
  "source": "supabase",
  "country": null,
  "cities": []
}
```

### `mode=city`

Returns company bubbles and precise markers for the future city/neighbourhood layers.

```json
{
  "mode": "city",
  "source": "supabase",
  "bubbles": [],
  "markers": []
}
```

### `mode=jobs`

Returns filtered job summaries for the panel/list mode.

```json
{
  "mode": "jobs",
  "source": "supabase",
  "filters": {
    "postedWithin": "any-time"
  },
  "jobs": []
}
```

### `mode=detail&id=<job-id>`

Returns one job detail payload for the right-side job panel. Apply URLs are checked before the route returns detail data.

```json
{
  "mode": "detail",
  "source": "supabase",
  "job": {
    "id": "00000000-0000-0000-0000-000000000000",
    "trustLine": "Redirects to the official application portal"
  }
}
```

## Health Check

```json
{
  "status": "ok",
  "service": "job-globe-web",
  "checkedAt": "2026-04-30T00:00:00.000Z",
  "checks": [
    {
      "name": "environment",
      "status": "ok"
    },
    {
      "name": "supabase.jobs",
      "status": "ok"
    },
    {
      "name": "supabase.migrations",
      "status": "ok"
    }
  ]
}
```
