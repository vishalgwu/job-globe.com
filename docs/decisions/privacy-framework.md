# Privacy Framework

Updated: 2026-05-11

This file is an implementation privacy checklist for the MVP. It is not legal advice and is not legal sign-off.

The product should remain controlled-demo only until the launch blockers below are fixed.

## Data In Scope

- Account data: email, Supabase subject, role, display name, timestamps, deleted-at field.
- Profile data: headline, preferred locations, remote preference, work authorization, salary expectation, onboarding answers, resume consent flag.
- Resume data: raw Storage object key, file hash, raw deletion deadline, parser version, parsed text, parsed profile JSON, confidence JSON, retention flag.
- Product data: saved jobs, application redirect records, alert subscriptions, notifications.
- AI/cache data: quick-prep cache rows keyed by job and optional user.
- System data: agent run logs and audit events.

## Current Resume Handling

Implemented:

- Authenticated upload writes raw resume files to Supabase Storage bucket `resumes`.
- Object path is scoped under the internal user ID.
- Upload stores file hash and raw deletion deadline in `resume_extractions`.
- Signed URLs are short-lived.
- `DELETE /api/resume` removes the current raw object and clears `raw_object_key`.
- Resume upload/delete actions write audit events.
- A parser worker exists for text extraction and OpenAI structured parsing.

Known defects:

- Parser download logic treats `<userId>/<file>` as `<bucket>/<path>`, so uploaded resumes do not parse end-to-end.
- Upload allows `.doc` and `.rtf`; extractor support is limited to `.txt`, `.pdf`, and `.docx`.
- No parse-status endpoint or parsed-profile correction UI exists.
- Automated raw-file deletion by retention deadline is not proven as a complete Storage cleanup path.
- Resume parser tests currently fail.

## Account Rights

Implemented:

- `GET /api/account` exports profile, resume extraction rows, saved jobs, application records, alerts, and notifications.
- `DELETE /api/account` route exists.

Known defects:

- Deletion references non-existent table `job_applications`; the schema table is `applications`.
- Deletion does not remove raw resume objects from Supabase Storage.
- Deletion does not anonymize or remove the internal `users` row.
- No user-facing settings page exposes export/delete controls.
- No correction flow exists for parsed resume/profile data.

## AI Processing

Current AI paths:

- Resume parser sends extracted resume text to OpenAI for structured parsing.
- Job/profile embedding workers call OpenAI embeddings.
- `/api/quick-prep` calls OpenAI chat completions and caches the result.

Privacy issues:

- `/api/quick-prep` includes full job descriptions. The source product spec calls for minimized prompts using job title/function/company/key skills and the user's top matching skills, not full raw descriptions or raw resumes.
- No legally reviewed AI/subprocessor disclosure exists.
- No Data Processing Addendum evidence is stored in the repo.

## Retention Targets

| Data | Target |
|---|---|
| Raw resume files | Default 30 days through `RESUME_RAW_RETENTION_DAYS`; user can delete the current raw file. |
| Parsed resume/profile data | Retain while account is active, subject to deletion/correction flows. |
| Saved jobs, applications, alerts, notifications | Retain while account is active. |
| Quick-prep cache | API cache defaults to 24 hours. |
| Audit events | Retention policy tables exist; coverage still needs review. |

## Launch Blockers

- Fix account deletion correctness before collecting real-user resumes.
- Fix resume parser Storage path handling and raw-file retention cleanup.
- Update `/privacy` with legal-approved policy text.
- Add parsed-profile correction or remove any correction claims from user-facing copy.
- Review Supabase RLS and Storage bucket policies.
- Minimize quick-prep prompts and document OpenAI processing.
- Verify audit coverage for resume upload/delete, profile update, saved jobs, apply redirects, alert create/delete, account export/delete, worker failure, and retention cleanup.
