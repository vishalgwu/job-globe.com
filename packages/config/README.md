# Config Package

Purpose: committed environment templates for local, staging, and production setup.

This package is not a runtime config library. Runtime settings are currently read by:

- Next.js from root `.env` / Vercel environment variables
- Workers from `apps/workers/src/job_globe_workers/settings.py`
- Docker Compose from root `.env`

Files:

- `environments/development.env.example`
- `environments/staging.env.example`
- `environments/production.env.example`

See also:

- `../../.env.example`
- `../../docs/md/INFRASTRUCTURE.md`
- `../../docs/md/SHARED_PACKAGES.md`
