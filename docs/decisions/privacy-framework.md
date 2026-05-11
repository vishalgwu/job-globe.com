# Privacy Framework

Updated: 2026-05-11

## Status

Draft implementation reference. This is not legal advice and is not legal sign-off.

The current product is acceptable only for controlled demos with synthetic or test data. It is not ready for public launch or unsupervised collection of real resumes.

## Current Privacy-Relevant Data In Code

- Account data: email, Supabase provider subject, role, display name, timestamps, deleted-at field.
- Profile data: headline, preferred locations, remote preference, work authorization, salary expectation, onboarding preferences, resume consent flag.
- Resume data: raw Storage object key, file hash, raw deletion deadline, parser version, parsed text, parsed profile JSON, confidence JSON, retention flag.
- Product data: saved jobs, application redirect records, alert subscriptions, notifications.
- AI/cache data: quick-prep cache rows keyed by job and optional user.
- System data: agent run logs and audit events.

## Current Resume Handling

Implemented:

- Authenticated upload route writes raw resume files to Supabase Storage bucket `resumes`.
- Object path is scoped under the internal user ID.
- Upload stores file hash and raw deletion deadline in `resume_extractions`.
- Signed URLs are short-lived.
- `DELETE /api/resume` removes the raw object for the current resume and clears `raw_object_key`.
- Upload and raw-delete actions write audit events.
- A resume parser worker exists and is intended to extract text and structured profile JSON.

Known defects / gaps:

- The resume parser currently interprets `<userId>/<file>` as `<bucket>/<path>`, so uploaded files will not download correctly for parsing.
- Upload route allows `.doc` and `.rtf`, but the extractor supports only `.txt`, `.pdf`, and `.docx`.
- No parse-status endpoint or UI state exists after upload.
- No parsed-profile correction UI exists.
- Automated raw-file deletion by retention deadline is not proven as a complete Storage cleanup path.
- Worker tests for resume extraction currently fail.

## Current Account Rights Controls

Implemented:

- `GET /api/account` returns JSON export data for profile, resume extraction rows, saved jobs, application records, alerts, and notifications.
- `DELETE /api/account` route exists.

Known defects / gaps:

- Account deletion currently references a non-existent `job_applications` table; the schema table is `applications`.
- Account deletion does not delete raw resume objects from Supabase Storage.
- Account deletion does not anonymize or remove the internal `users` row.
- No user-facing account settings page exposes export/delete controls.
- No parsed-profile correction flow exists.
- No legal-approved policy text exists.

## AI / Subprocessor Notes

Current AI paths in code:

- Resume parser sends extracted resume text to OpenAI for structured parsing.
- Job/profile embedding workers call OpenAI embeddings.
- `/api/quick-prep` calls OpenAI chat completions and caches the result.

Current issues:

- `/api/quick-prep` includes the full job description in the prompt. The product spec says quick-prep prompts should be minimized to job title/function/company/key skills/user top matching skills, not full raw descriptions or raw resumes.
- No subprocessor list or Data Processing Addendum evidence is in the repo.
- No explicit user-facing AI processing disclosure has been legally reviewed.

## Lawful Basis Targets

These are policy targets, not legal conclusions:

- Account and core product data: contract necessity to provide the service.
- Resume/profile data: explicit consent during onboarding or resume upload.
- Reliability/security events: legitimate interest, minimized to operational needs.
- Compliance audit logs: security and legal/compliance interest.

## Retention Targets

| Data | Target |
|---|---|
| Raw resume files | Default 30 days unless policy changes via `RESUME_RAW_RETENTION_DAYS`; user can delete current raw file. |
| Parsed resume/profile data | Retain while account is active, unless user deletes account or correction/deletion is implemented. |
| Saved jobs, applications, alerts, notifications | Retain while account is active. |
| Quick-prep cache | API cache defaults to 24 hours. |
| Audit events | Retention policies exist in code, but full coverage/reporting needs review. |

## Consent UX Requirements

Implemented:

- Resume upload includes consent language and raw retention language.
- Work authorization and salary fields are optional.
- `/privacy` route exists.

Missing or incorrect:

- `/privacy` route is still a draft notice and has not been legally reviewed.
- Onboarding start does not provide a full notice-at-collection summary.
- No reviewed policy text for OpenAI processing, retention, export, deletion, correction, and subprocessor handling.
- No user-facing correction/export/delete settings page.

## Launch-Blocking Privacy Gaps

- Fix account deletion correctness before any real-user launch.
- Fix resume parser Storage path and retention cleanup.
- Update `/privacy` route to match code and legal policy.
- Add parsed-profile correction UI or remove correction claims.
- Complete Supabase RLS and Storage bucket policy review.
- Complete legal/privacy review of AI subprocessors and prompt minimization.
- Confirm audit coverage for resume upload/delete, profile update, save/apply, alert create/delete, account export/delete, worker failure, and retention cleanup.
