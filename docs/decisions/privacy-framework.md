# Privacy Framework

## Status

Draft reference for implementation. It is not a legal sign-off.

This document reflects the current codebase and the remaining privacy work needed before launch.

## Data Currently Represented In Code

- Account data: email, Supabase provider subject, role, display name, timestamps.
- Profile data: headline, preferred locations, remote preference, work authorization, salary expectation, onboarding preferences, resume consent flag.
- Resume metadata: raw storage object key, file hash, raw delete deadline, parser version, parsed text field, parsed profile JSON, confidence JSON, retention flag.
- Product data: saved jobs, application redirect records, alert subscriptions.
- System data: agent run logs and selected audit-event writes.

## Current Resume Handling

Implemented:

- Authenticated upload to the Supabase Storage bucket named `resumes`.
- Object path is scoped by internal user ID.
- File type and size validation exist in the resume API.
- Raw file hash and retention deadline are stored in `resume_extractions`.
- Signed URLs are short-lived.
- Users can call `DELETE /api/resume` to remove the raw object and clear the object key.
- Resume upload/delete actions write selected audit events.

Not implemented:

- PDF/DOCX text parsing in the web upload path.
- Structured resume extraction worker.
- User correction flow for parsed fields.
- Automated raw-file deletion after the retention deadline.
- Account-level delete/export/correction flows.
- Legal-approved final privacy policy copy.

## Lawful Basis Targets

These targets are planned policy requirements and still need legal review:

- Account and core product data: contract necessity to provide the service.
- Resume/profile data: explicit consent during onboarding or resume upload.
- Reliability events: legitimate interest, minimized to service operations.
- Compliance audit logs: security and legal/compliance interest.

## Retention Targets

- Raw resume files: default 30 days unless policy changes through `RESUME_RAW_RETENTION_DAYS`.
- Parsed profile data: retained while the account is active.
- Saved jobs, applications, and alerts: retained while the account is active.
- Audit events: intended compliance retention policy is not implemented in code.
- Deleted accounts: delete/export/account-erasure workflow is not implemented.

## Consent UX Requirements

Implemented:

- Resume upload includes consent text and raw retention language.
- A draft `/privacy` route exists for controlled demos.
- Work authorization and salary fields are optional in onboarding/profile validation.

Missing:

- Notice at onboarding start that clearly explains profile data collection.
- Delete account, export data, and correction controls.
- Admin-only access path for audit/compliance records.
- Verified copy approval from legal/privacy owner.

## Subprocessor And Integration Notes

Current integrations in code:

- Supabase for auth, database, and resume storage.
- Redis/PostgreSQL for workers when running locally or in deployed worker infrastructure.

Planned but not fully active:

- OpenAI for embeddings and quick-prep generation.
- Transactional email provider for alerts.
- Production object storage policy beyond Supabase Storage configuration.

## Launch Blocking Privacy Gaps

- No self-service account deletion.
- No data export.
- No profile correction flow for parsed resume data.
- No automated raw resume retention job.
- No audit-event retention policy, reporting UI, or complete event coverage.
- No legal/privacy sign-off evidence in the repository.
