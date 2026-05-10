# Alerts API

Source of implementation: `apps/web/app/api/alerts/route.ts`

The Alerts API lets authenticated users create, list, pause/resume, and delete saved job alerts.

## Current Status

Implemented:

- `GET /api/alerts`
- `POST /api/alerts`
- `PATCH /api/alerts?id=<alert-id>`
- `DELETE /api/alerts?id=<alert-id>`
- Auth guard through `resolveRequestUser()`
- Daily active-alert limit through `ALERT_DAILY_MAX_PER_USER`

Not implemented:

- Background alert evaluation worker
- Email delivery through a transactional email provider

## Responses

`GET /api/alerts` returns:

```json
{
  "ok": true,
  "alerts": []
}
```

`POST /api/alerts` accepts:

```json
{
  "name": "Remote senior SWE in Europe",
  "query": {},
  "minimum_match_score": 70,
  "delivery_channels": ["in_app"]
}
```

`PATCH /api/alerts?id=<alert-id>` accepts:

```json
{
  "active": false
}
```

Unauthenticated requests return HTTP 401.

See `docs/md/API.md` and `docs/md/PROJECT_STATUS.md` for module-level status.
