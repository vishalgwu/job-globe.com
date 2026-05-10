# Alerts API

The Alerts API will allow signed-in users to save job searches and receive notifications when new matching jobs appear.

## Current status

`GET /api/alerts` and `POST /api/alerts` exist as route files but return placeholder responses. Functional implementation is Phase 5 work.

## Planned behaviour (Phase 5)

### `GET /api/alerts`

Returns all active alert subscriptions for the authenticated user.

```json
{
  "ok": true,
  "alerts": [
    {
      "id": "<uuid>",
      "userId": "<uuid>",
      "label": "Remote senior SWE in Europe",
      "filters": {
        "category": "software-engineering",
        "remote": "remote",
        "country": "GB",
        "jobType": "full-time"
      },
      "channel": "email",
      "frequency": "daily",
      "createdAt": "2026-05-09T00:00:00.000Z",
      "lastFiredAt": null
    }
  ]
}
```

### `POST /api/alerts`

Creates a new alert subscription from the current filter state.

```json
{
  "label": "Remote senior SWE in Europe",
  "filters": {
    "category": "software-engineering",
    "remote": "remote",
    "country": "GB"
  },
  "channel": "email",
  "frequency": "daily"
}
```

### `DELETE /api/alerts?id=<alert-id>`

Removes an alert subscription.

## Delivery

Alert delivery will use a transactional email provider configured via `TRANSACTIONAL_EMAIL_API_KEY`. The daily maximum per user is controlled by `ALERT_DAILY_MAX_PER_USER` (default: 5). Legal sign-off on alert opt-in copy is required before enabling delivery in production.

## Database tables

The `alerts` and `alert_subscriptions` tables are already in the schema (migration 009). The delivery worker is a Phase 5 implementation item in `apps/workers/agents/alerting/`.
