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

Related documentation:

- `../../.env.example`
- `../../docs/md/architecture.md`
- `../../docs/md/developer-handoff.md`
