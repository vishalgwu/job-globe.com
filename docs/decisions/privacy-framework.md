# Privacy Framework

## Status

Drafted for Legal/Privacy Advisor sign-off

## Data Collected

- Account data: email, auth provider subject, role, display name.
- Profile data: headline, preferred locations, skills, work authorization, optional salary expectations.
- Resume data: uploaded file object key, file hash, parsed text, structured extraction, per-field confidence.
- Product data: saved jobs, application redirects, alert subscriptions, analytics events.
- System data: agent run logs and audit events.

## Lawful Basis

- Account and product data: contract necessity to provide the service.
- Resume and profile data: explicit consent during onboarding or resume upload.
- Analytics and reliability events: legitimate interest, minimized to product operations.
- Compliance audit logs: legal obligation and legitimate security interest.

## Resume Handling Policy

Resume upload flow: user upload -> private object storage with encryption at rest -> parser extraction into `resume_extractions` -> raw file deleted after `RESUME_RAW_RETENTION_DAYS` unless the user opts to retain it where allowed.

Raw resume files must never be public. Access requires a signed URL scoped to the authenticated user. Parsed fields store confidence values so users can correct low-confidence data.

## Retention

- Raw resume files: default 30 days.
- Parsed profile data: retained while the account is active.
- Saved jobs, applications, and alerts: retained while the account is active.
- Audit events: retained for 2 years, then archived or deleted according to compliance policy.
- Deleted accounts: identifiable profile/resume data removed within 24 hours as a technical target.

## Consent UX Requirements

- Onboarding start must state what profile data is collected and why.
- Resume upload must state raw file retention, parsing purpose, and deletion controls.
- Work authorization and salary fields are optional and marked sensitive.
- Alerts require explicit channel selection.
- Users must have self-service delete, export, and correction controls before launch.

## Subprocessors

- Supabase: authentication and managed database services, if selected for hosted environments.
- OpenAI: embedding and quick-prep generation in later steps, scoped to minimized prompts.
- Object storage provider: encrypted resume file storage.
- Transactional email provider: alert and account emails.

## Sign-off

Legal/privacy sign-off is required before full production launch.
