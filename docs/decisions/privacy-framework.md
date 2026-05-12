# Privacy Framework

Updated: 2026-05-12

This file is an implementation privacy checklist for the MVP. It is not legal advice and it is not legal sign-off.

The product should remain controlled-demo only until the launch blockers in this file and `docs/remaining_work_master.md` are resolved.

## Data In Scope

| Data class    | Current handling                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account data  | Email, Supabase subject, role, display name, timestamps, and deleted-at fields.                                                                              |
| Profile data  | Headline, preferred locations, remote preference, work authorization, salary expectation, onboarding answers, skills, and resume consent flag.               |
| Resume data   | Raw Storage object key while retained, raw deletion deadline, parser version, parsed-at timestamp, parsed profile JSON, confidence JSON, and retention flag. |
| Product data  | Saved jobs, application redirect records, alert subscriptions, and notifications.                                                                            |
| AI/cache data | Quick-prep cache rows keyed by job and optional user.                                                                                                        |
| System data   | Agent run logs and audit events.                                                                                                                             |

## Resume Handling

Implemented:

- Authenticated upload writes raw resume files to the private Supabase Storage bucket named `resumes`.
- Object paths are scoped under the internal user ID.
- Upload records raw-file metadata and a deletion deadline in `resume_extractions`.
- `GET /api/resume` returns resume metadata, signed preview URL when a raw file exists, `parseStatus`, and `parsedAt`.
- `DELETE /api/resume` removes the current raw object and clears raw-file metadata.
- Upload and delete actions write audit events.
- Upload accepts PDF, DOCX, and TXT.
- The parser worker downloads current resume objects, extracts text, calls OpenAI for structured parsing, stores `parsed_profile` and `confidence`, sets `parsed_at`, and leaves full `parsed_text` null.
- The parser worker includes cleanup logic for expired raw resume objects.

Known gaps:

- No parsed-profile correction UI exists.
- Production Supabase Storage bucket and object policies must still be verified in the dashboard.

## Account Rights

Implemented:

- `GET /api/account` exports profile, resume extraction rows, saved jobs, application records, alerts, and notifications.
- `DELETE /api/account` removes resume Storage objects, calls `delete_internal_account(UUID)`, and deletes the Supabase Auth user.
- The database function deletes internal `users` rows, cascades related app rows, and nulls audit user identifiers.

Known gaps:

- No user-facing settings page exposes export/delete controls.
- No parsed-profile correction flow exists.
- Legal wording around deletion, retention, and correction is still draft.

## AI Processing

Current AI paths:

- Resume parser sends extracted resume text to OpenAI for structured parsing.
- Job/profile embedding workers send text representations to OpenAI embeddings.
- `/api/quick-prep` sends limited job/profile context to OpenAI chat completions and caches the JSON result.

Quick-prep context is intentionally narrow: job title, employment type, remote type, seniority, required skills, and optional candidate skills/remote preference. It does not send raw resumes or full job descriptions.

Known gaps:

- No legally reviewed AI disclosure exists.
- No Data Processing Addendum evidence is stored in the repo.
- `QUICK_PREP_MODEL` currently doubles as the worker resume-parser model setting; model naming should be clarified before production operations.

## Retention Targets

| Data                                            | Target                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Raw resume files                                | Default 30 days through `RESUME_RAW_RETENTION_DAYS`; user can delete the current raw file. |
| Parsed profile data                             | Retained while account is active, subject to account deletion and future correction flow.  |
| Full parsed resume text                         | Not retained; `parsed_text` is set to null after parsing.                                  |
| Saved jobs, applications, alerts, notifications | Retained while account is active.                                                          |
| Quick-prep cache                                | API cache defaults to 24 hours.                                                            |
| Audit events                                    | Retention policy tables exist; production coverage still needs review.                     |

## Security Controls In Code

- Security headers are configured in `next.config.mjs`.
- API CORS allowlist is configured through `ALLOWED_ORIGINS`.
- API rate limiting is applied in middleware.
- Webhook routes require configured secrets and perform constant-time HMAC checks with timestamp freshness.
- Private resume object paths are scoped per internal user.
- Account deletion removes raw resume objects before deleting database/auth state.
- Migration 017 defines RLS and Storage policies for Supabase environments.

## Launch Blockers

- Replace `/privacy` draft text with legal-approved policy copy.
- Verify Supabase RLS policies in the production dashboard.
- Verify the private `resumes` bucket and Storage object policies in the production dashboard.
- Document OpenAI, Supabase, Resend, Vercel, Railway, and job-source subprocessors for legal review.
- Add parsed-profile correction UI or explicitly defer correction in product copy.
- Add user-facing account export/delete controls.
- Verify audit coverage for profile updates, resume upload/delete/parse, saved jobs, apply redirects, alert create/delete, account export/delete, worker failures, and retention cleanup.
