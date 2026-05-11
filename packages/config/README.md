# Config Package

This package contains committed environment templates only. It is not a runtime configuration library.

Runtime configuration is read from:

- root `.env` or Vercel variables by the Next.js app
- `apps/workers/src/job_globe_workers/settings.py` by the worker package
- root `.env` by Docker Compose

Files:

- `environments/development.env.example`
- `environments/staging.env.example`
- `environments/production.env.example`

Audit note as of 2026-05-11:

- Root `.env.example` should add `SMARTRECRUITERS_COMPANY_IDS`, `REDIS_STREAM_VERIFICATION`, and `REDIS_STREAM_CANONICAL`.
- `TRANSACTIONAL_EMAIL_API_KEY` appears legacy/unused; current worker settings use `RESEND_API_KEY`.
- Keep root `.env.example`, these templates, and `apps/workers/src/job_globe_workers/settings.py` synchronized whenever environment keys change.
