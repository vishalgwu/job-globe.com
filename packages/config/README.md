# Config Package

Updated: 2026-05-12

This package contains committed environment-template notes only. It is not a runtime configuration library.

Runtime configuration is read from:

- The root `.env` file or Vercel variables by the Next.js app.
- `apps/workers/src/job_globe_workers/settings.py` by the worker package.
- The root `.env` file by Docker Compose.

## Files

| File                                   | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `environments/development.env.example` | Lightweight development feature flags.                             |
| `environments/staging.env.example`     | Lightweight staging feature flags plus core Supabase placeholders. |
| `environments/production.env.example`  | Lightweight production feature flags.                              |
| `../../.env.example`                   | Canonical full-project environment template.                       |

## Current Guidance

- Keep real secrets out of Git. The root `.env` file is ignored.
- Treat root `.env.example` as the canonical list of committed environment keys.
- Keep `apps/workers/src/job_globe_workers/settings.py`, root `.env.example`, Docker Compose, Vercel variables, and Railway variables synchronized when adding or renaming settings.
- Connector settings now include Adzuna, USAJobs, EURES, Greenhouse boards, Lever company slugs, Workable, and SmartRecruiters.
- Worker stream settings include discovery, verification, canonical, alerts, consumer group/name, max retries, and DLQ suffix.
- `TRANSACTIONAL_EMAIL_API_KEY` is legacy/unused; current alert email delivery uses `RESEND_API_KEY`.
- `QUICK_PREP_MODEL` is currently read by the worker resume parser. Clarify or split model settings before production operations if quick prep and resume parsing need different models.
