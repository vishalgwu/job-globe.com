# Deployment Inventory

Last updated: 2026-04-30

This document records provider metadata that can be safely committed. Do not paste API keys, service role keys, passwords, database URLs with credentials, or storage secrets into this file.

## Supabase

| Field | Value |
| --- | --- |
| Project name | `job-globe-staging` |
| Project ID / ref | `mqfiocolakvqkpvxlafk` |
| Project URL | `https://mqfiocolakvqkpvxlafk.supabase.co` |
| Region | `us-east-1` |
| Environment | Staging |
| Auth provider | Supabase |
| Connection type | PostgreSQL pooler |
| Database host | `aws-1-us-east-1.pooler.supabase.com` |
| Database port | `6543` |
| Database name | `postgres` |
| Database user | `postgres.mqfiocolakvqkpvxlafk` |
| Required public variable | `NEXT_PUBLIC_SUPABASE_URL` |
| Required public key variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Required server key variable | `SUPABASE_SERVICE_ROLE_KEY` |
| Database URL variable | `DATABASE_URL` is set in the private root `.env` with the Supabase pooler password |
| Migration status | All SQL migrations were run against Supabase staging |
| Schema verification | 17 public tables were confirmed |
| Migration history | Tracked in `public.schema_migrations` by `packages/database/scripts/apply_migrations.py` |

Evidence in this workspace:

- Root `.env` contains a Supabase URL for project ref `mqfiocolakvqkpvxlafk`.
- Root `.env` contains `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a password-bearing `DATABASE_URL`.
- `docs/qa/step-1-completion-report.md` records Supabase staging configuration, migration execution, Auth endpoint verification, and REST table verification.

## Vercel

| Field | Value |
| --- | --- |
| Production URL | `https://job-globe-com-web.vercel.app/` |
| Project name | `job-globe-com-web` |
| Owner | `vishalgwu` |
| Environment | Production |
| Branch | `main` |
| Latest application-change commit | `1a54391` (`Update globe UI and deployment inventory`) |
| Repository branch tip | `main`; verify with `git rev-parse origin/main` after each push |
| Deployment status | Ready |
| App | `apps/web` |
| Framework | Next.js |
| Expected install command | `npm install` |
| Expected build command | `npm --workspace apps/web run build` |
| Expected output | Next.js managed output |

Evidence in this workspace:

- `README.md` records the live deployment URL.
- `docs/qa/step-1-completion-report.md` records that the live Vercel URL returned HTTP 200 during final cross-check.

## Environment Files

- `.env` is the local private file and is ignored by Git.
- `.env.example` is the safe committed template.
- Docker Compose uses `.env` for local web and worker containers.
- Staging and production secrets should be set in Vercel, Supabase, GitHub Actions, or the chosen managed secret store.
- Vercel deployment verification is documented in `docs/runbooks/vercel-deployment.md`.

## Still Needed

- Rotate any secret that is ever pasted into chat, screenshots, tickets, or committed files.
- Keep this inventory updated whenever the Supabase project, Vercel project, branch, commit, or environment ownership changes.
