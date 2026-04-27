# Jobs API

Step 2 foundation exposes a demo-only `GET /api/jobs` route. It returns fake but structured data that matches the shared TypeScript contracts in `packages/shared-types/typescript`.

No live ingestion, scraping, or Supabase query path is wired in this step.

## Query Modes

All modes accept optional filters:

| Query          | Values                                              |
| -------------- | --------------------------------------------------- |
| `category`     | Demo taxonomy value, such as `software-engineering` |
| `country`      | ISO-like country code, such as `US`                 |
| `city`         | City name                                           |
| `remote`       | `remote`, `hybrid`, `on-site`                       |
| `jobType`      | `internship`, `new-grad`, `full-time`, `contract`   |
| `q` or `query` | Free-text demo search                               |

### `mode=global`

Returns country-level job density for the globe heat layer.

```json
{
  "mode": "global",
  "source": "demo",
  "filters": {},
  "countries": []
}
```

### `mode=country`

Returns a country summary plus city-level rollups.

```json
{
  "mode": "country",
  "source": "demo",
  "country": null,
  "cities": []
}
```

### `mode=city`

Returns company bubbles and precise markers for the future city/neighbourhood layers.

```json
{
  "mode": "city",
  "source": "demo",
  "bubbles": [],
  "markers": []
}
```

### `mode=jobs`

Returns filtered job summaries for the panel/list mode.

```json
{
  "mode": "jobs",
  "source": "demo",
  "jobs": []
}
```

### `mode=detail&id=demo-job-001`

Returns one job detail payload for the right-side job panel. Apply URLs are checked before the route returns detail data.

```json
{
  "mode": "detail",
  "source": "demo",
  "job": {
    "id": "demo-job-001",
    "trustLine": "Redirects to the official application portal"
  }
}
```
