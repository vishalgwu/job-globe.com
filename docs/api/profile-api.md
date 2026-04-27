# Profile API

Step 2 foundation exposes a safe demo-mode Profile API stub. It validates onboarding answers and returns a placeholder profile response without writing to Supabase.

Resume parsing and authenticated profile persistence remain later-step work.

## `GET /api/profile`

Returns the current profile placeholder.

```json
{
  "mode": "demo",
  "profile": null,
  "source": "step-2-foundation",
  "message": "Profile persistence is a safe demo stub until authenticated Supabase writes are wired."
}
```

## `POST /api/profile`

Accepts onboarding answers.

```json
{
  "answers": {
    "desiredRoleFamily": "software-engineering",
    "targetLocations": ["New York", "Remote"],
    "remotePreference": "hybrid",
    "jobTypes": ["internship", "new-grad"],
    "salarySensitivity": null,
    "companySizePreference": "no-preference",
    "timeToStart": "exploring",
    "workAuthorization": null,
    "resumeConsentAccepted": false,
    "resumeFileName": null
  }
}
```

Required fields:

- `desiredRoleFamily`
- `targetLocations`
- `remotePreference`
- `jobTypes`

Successful demo response:

```json
{
  "ok": true,
  "mode": "demo",
  "profile": {
    "id": "demo-profile-local",
    "userId": null,
    "mode": "demo",
    "savedAt": "2026-04-26T00:00:00.000Z"
  }
}
```

Validation errors return HTTP `400` and do not log raw resume content.
