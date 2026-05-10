# Profile and Resume API

Source of implementation:

- `apps/web/app/api/profile/route.ts`
- `apps/web/app/api/resume/route.ts`

## Current Status

Implemented:

- Authenticated profile read/write.
- Unauthenticated profile requests return HTTP 401.
- Resume upload to private Supabase Storage.
- Resume signed URL fetch.
- Raw resume file delete.
- Retention deadline through `RESUME_RAW_RETENTION_DAYS`.

## `GET /api/profile`

Returns the authenticated user's profile row converted to onboarding answers.

Example:

```json
{
  "mode": "authenticated",
  "profile": null,
  "source": "supabase"
}
```

If a profile exists, `profile` contains `id`, `userId`, `mode`, `answers`, and `savedAt`.

Unauthenticated requests return:

```json
{ "error": "Unauthorized" }
```

## `POST /api/profile`

Saves onboarding answers for the authenticated user.

Required fields inside `answers`:

- `desiredRoleFamily`
- `targetLocations`
- `remotePreference`
- `jobTypes`

Successful writes return:

```json
{
  "ok": true,
  "mode": "authenticated",
  "profile": {}
}
```

Validation errors return HTTP 400. Unauthenticated requests return HTTP 401.

## Resume Routes

- `GET /api/resume` returns the current resume signed URL metadata or `resume: null`.
- `POST /api/resume` accepts multipart form data with a `file` field.
- `DELETE /api/resume` removes the raw storage object and clears the raw object key.

Raw resume files are private and accessed only through short-lived signed URLs.

See `docs/md/API.md` and `docs/md/PROJECT_STATUS.md` for module-level status.
