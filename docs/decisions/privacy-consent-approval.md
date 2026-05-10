# Privacy Consent Copy — Approval Record

Last updated: 2026-05-10

## Purpose

This document records the review and approval status of user-facing consent copy for resume upload and profile data collection. Per the privacy framework (`docs/decisions/privacy-framework.md`), Legal/Privacy sign-off is required before real resume processing is enabled in production.

## Resume upload consent copy

The consent copy displayed in the ResumeUpload component:

> "I consent to Job Globe storing my resume file for up to 30 days for the purpose of job matching. I understand I can delete my file at any time from my profile page."

## Profile data consent (onboarding)

The consent statements displayed during onboarding:

> - "Your preferences are used only to personalise job matches and quick prep."
> - "Work authorisation and salary fields are optional and marked sensitive."
> - "You can update or delete your profile at any time."

## Sign-off status

| Item | Reviewer | Status | Date |
|---|---|---|---|
| Resume upload consent copy | Legal / Privacy Advisor | Pending sign-off | — |
| Profile data collection notice | Legal / Privacy Advisor | Pending sign-off | — |
| Alert opt-in copy | Legal / Privacy Advisor | Pending sign-off | — |
| Subprocessor disclosure (Supabase, OpenAI) | Legal / Privacy Advisor | Pending sign-off | — |

## Pre-launch requirements

Before enabling live resume processing in production, the following must be complete:

1. Legal sign-off recorded in this document with reviewer name and date.
2. Consent copy deployed to production without modification.
3. Delete and export controls verified functional in production.
4. Subprocessor list reviewed and accepted.

## Contact

For sign-off, contact the project owner (Vishal, vishalfulsundar2024@gmail.com) to initiate the legal review process.
