# Profile API

The Profile API stores and retrieves onboarding answers for authenticated users. All routes require a valid Supabase session cookie. Unauthenticated requests receive HTTP 401.

## `GET /api/profile`

Returns the stored onboarding answers for the signed-in user.

**Success response (authenticated, profile exists):**

```json
{
  "ok": true,
  "mode": "authenticated",
  "profile": {
    "id": "<uuid>",
    "userId": "<uuid>",
    "desiredRoleFamily": "software-engineering",
    "targetLocations": ["New York", "Remote"],
    "remotePreference": "hybrid",
    "jobTypes": ["internship", "new-grad"],
    "salarySensitivity": null,
    "companySizePreference": "no-preference",
    "timeToStart": "exploring",
    "workAuthorization": null,
    "resumeConsentAccepted": false,
    "resumeFileName": null,
    "savedAt": "2026-05-09T00:00:00.000Z"
  }
}
```

**Success response (authenticated, no profile yet):**

```json
{
  "ok": true,
  "mode": "authenticated",
  "profile": null
}
```

**Unauthenticated:**

```json
{ "error": "Unauthorized" }
```

HTTP 401.

## `POST /api/profile`

Saves or updates onboarding answers for the signed-in user. Writes to the `profiles` table in Supabase.

**Request body:**

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

**Required fields:**

- `desiredRoleFamily` — string
- `targetLocations` — non-empty array of strings
- `remotePreference` — `"remote"`, `"hybrid"`, or `"on-site"`
- `jobTypes` — non-empty array containing one or more of `"internship"`, `"new-grad"`, `"full-time"`, `"contract"`

**Success response:**

```json
{
  "ok": true,
  "mode": "authenticated",
  "profile": {
    "id": "<uuid>",
    "userId": "<uuid>",
    "savedAt": "2026-05-09T00:00:00.000Z"
  }
}
```

The `mode` field is `"authenticated"` when the user is signed in and the profile is persisted to the database. The OnboardingFlow component uses this to show "Profile saved to your account." vs "Profile saved in demo mode."

Validation errors return HTTP 400. Unauthenticated requests return HTTP 401.

## Resume endpoints

See the `/api/resume` route (same file group):

- `GET /api/resume` — returns a signed URL for the user's uploaded resume file.
- `POST /api/resume` — accepts `multipart/form-data` with a `file` field. Stores the file in private Supabase Storage. Requires `resumeConsentAccepted: true` in the user's profile. Returns `{ ok, raw_delete_after }` where `raw_delete_after` is the ISO date when the raw file will be auto-deleted per the privacy policy.
- `DELETE /api/resume` — deletes the raw resume file from storage and clears the resume metadata from the profile row.

Raw resume files are stored in a private bucket (never public) and are only accessible via signed URLs scoped to the authenticated user. Default retention is 30 days (`RESUME_RAW_RETENTION_DAYS` env var). See `docs/decisions/privacy-framework.md` for the full policy.
