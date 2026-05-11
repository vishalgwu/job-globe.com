# Privacy Framework

Updated: 2026-05-11 (Phase 2 verified complete)

This file is an implementation privacy checklist for the MVP. It is not legal advice and is not legal sign-off.

The product should remain controlled-demo only until the remaining launch blockers below are fixed.

## Data In Scope

- Account data: email, Supabase subject, role, display name, timestamps, deleted-at field.
- Profile data: headline, preferred locations, remote preference, work authorization, salary expectation, onboarding answers, resume consent flag.
- Resume data: raw Storage object key while retained, raw deletion deadline, parser version, parsed-at timestamp, parsed profile JSON, confidence JSON, retention flag.
- Product data: saved jobs, application redirect records, alert subscriptions, notifications.
- AI/cache data: quick-prep cache rows keyed by job and optional user.
- System data: agent run logs and audit events.

## Current Resume Handling

Implemented:

- Authenticated upload writes raw resume files to Supabase Storage bucket `resumes`.
- Object path is scoped under the internal user ID.
- Upload stores a raw deletion deadline in `resume_extractions`.
- Signed URLs are short-lived.
- `DELETE /api/resume` removes the current raw object and clears raw-file metadata.
- Resume upload/delete actions write audit events.
- Upload accepts only `.pdf`, `.docx`, and `.txt`, matching extractor support.
- The parser worker reads current `<userId>/<file>` object paths from the `resumes` bucket.
- The parser worker uses extracted text only during processing, then stores structured profile JSON and leaves `parsed_text` null.
- The parser worker deletes expired raw resume Storage objects and clears raw-file metadata after deletion succeeds.

Implemented:

- `GET /api/resume` now returns `parseStatus` ("none" / "pending" / "done") and `parsedAt`.
- Profile page (`/profile`) shows parse status and informs the user when match scoring is active.

Known gaps:

- No parsed-profile correction UI exists — users cannot edit parsed field values.

## Account Rights

Implemented:

- `GET /api/account` exports profile, resume extraction rows, saved jobs, application records, alerts, and notifications.
- `DELETE /api/account` removes resume Storage objects, calls the transactional `delete_internal_account` database function, then deletes the Supabase Auth user.
- Internal `users` rows are deleted, related app rows cascade, and audit user identifiers are nulled.

Known gaps:

- No user-facing settings page exposes export/delete controls.
- No correction flow exists for parsed resume/profile data.

## AI Processing

Current AI paths:

- Resume parser sends extracted resume text to OpenAI for structured parsing.
- Job/profile embedding workers call OpenAI embeddings.
- `/api/quick-prep` calls OpenAI chat completions and caches the result.

Privacy issues:

- `/api/quick-prep` sends job title, employment type, remote type, seniority, required skills, and optional candidate skills/remote preference. It does not send full job descriptions or resumes.
- No legally reviewed AI/subprocessor disclosure exists.
- No Data Processing Addendum evidence is stored in the repo.

## Retention Targets

| Data                                            | Target                                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Raw resume files                                | Default 30 days through `RESUME_RAW_RETENTION_DAYS`; user can delete the current raw file.                                               |
| Parsed resume/profile data                      | Structured profile JSON retained while account is active, subject to deletion/correction flows. Full parsed resume text is not retained. |
| Saved jobs, applications, alerts, notifications | Retain while account is active.                                                                                                          |
| Quick-prep cache                                | API cache defaults to 24 hours.                                                                                                          |
| Audit events                                    | Retention policy tables exist; coverage still needs review.                                                                              |

## Launch Blockers

- Update `/privacy` with legal-approved policy text (current text is a draft).
- Either add parsed-profile correction UI or explicitly remove any correction claims from user-facing copy. Current profile page does not claim correction is possible.
- Complete production Supabase verification of RLS and Storage bucket policies after project secrets are connected. Migration 017 defines the policies — they are runnable idempotently.
- Document OpenAI processing and subprocessor terms for legal review.
- Verify audit coverage for all key events: resume upload/delete, profile update, saved jobs, apply redirects, alert create/delete, account export/delete, worker failure, and retention cleanup.
