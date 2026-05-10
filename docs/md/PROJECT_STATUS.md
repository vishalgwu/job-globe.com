# Project Status

## Overall

Jarvis Job Globe is a full-stack job discovery platform with a Next.js web app, Supabase-backed APIs, PostgreSQL schema, Redis-based Python worker pipeline, and CI checks.

Status: launch hardening / Phase 6 prep  
Estimated completion: 85%

The core product is implemented: globe browsing, job APIs, auth, profiles, resume storage, saved jobs, alerts CRUD, application history, ingestion workers, migrations, tests, and deployment wiring. Remaining work is mainly production sign-off, alert email delivery, stronger production observability, resume NLP extraction, and embedding generation.

## Module Summary

| Module          | Status                                   | Notes                                                                                                  |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Frontend        | Complete with polish pending             | Globe UI, auth pages, onboarding, profile, saved, alerts, applications, and job panel are implemented. |
| API             | Complete with contract cleanup pending   | Main API routes exist and are tested. Some older docs had stale response examples.                     |
| Workers         | Core pipeline complete                   | Packaged worker source in `apps/workers/src/job_globe_workers` contains the active implementation.     |
| Database        | Complete for current product             | 13 migrations define 17 app tables plus seeds and validation/apply scripts.                            |
| Shared packages | Complete enough for current use          | TypeScript contracts are used by web. Python contract files exist but some are minimal placeholders.   |
| Infrastructure  | Local and CI complete; cloud IaC pending | Docker Compose, Dockerfiles, GitHub Actions, and Vercel handoff exist. Terraform is placeholder-only.  |

## Completed

- Monorepo layout with `apps`, `packages`, `infra`, `.github`, and `docs`.
- Next.js App Router web application under `apps/web`.
- Public globe experience with filters, zoom layers, list fallback, job panel, and saved jobs tray.
- Supabase auth integration with login, register, session, refresh, and logout flows.
- Authenticated profile, resume, saved jobs, alerts, and application history routes/pages.
- Supabase-backed job API with global, country, city, jobs, and detail modes.
- Rule-based match scoring with embedding-score blending support.
- Resume upload, signed URL fetch, and raw file deletion through private Supabase Storage.
- Python worker pipeline for discovery, verification, company identity, geo mapping, taxonomy, duplicate detection, and health logging.
- 7 source connectors in the packaged worker source.
- PostgreSQL migrations, seed data, and CI database validation.
- Web and worker tests in CI.

## In Progress

- Launch QA evidence: Lighthouse, browser/device, keyboard, VoiceOver, and NVDA checks.
- Legal/privacy approval for resume consent and data retention wording.
- Alert delivery beyond in-app CRUD.
- Production observability beyond structured logs and counters.
- Cleanup of legacy placeholder worker folders outside the packaged worker source.
- Documentation consolidation into this `docs/md` structure.

## Remaining

- Wire transactional email delivery for alerts.
- Implement production-grade alert evaluation/delivery workers if alerts need background dispatch.
- Implement resume NLP extraction and user correction flow.
- Generate and store job/profile embeddings for vector-based matching.
- Replace placeholder Terraform files with real infrastructure modules or remove them.
- Confirm branch protection settings in GitHub and record launch QA evidence.

## Key Blockers

- Alert email provider and delivery policy are not configured in code.
- Resume NLP and embedding scoring have schema support but no active generation pipeline.
- Terraform is not usable yet.
- Some existing docs previously disagreed on Phase 5 status; central docs now treat code as the implementation reference.

## Next Steps

1. Use `docs/md` as the source for module handoff and status tracking.
2. Complete launch QA and record results.
3. Decide whether alert delivery is required before launch or can remain in-app only.
4. Add resume NLP extraction only after privacy/legal sign-off.
5. Remove or archive legacy placeholder worker folders after confirming no scripts import them.
