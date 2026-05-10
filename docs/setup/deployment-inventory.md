# Deployment Inventory

This document records non-secret deployment metadata. Do not commit passwords, service role keys, API keys, access tokens, or full credential-bearing database URLs.

## Supabase

| Field                | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| Project name         | `job-globe-staging`                                         |
| Project ref          | `mqfiocolakvqkpvxlafk`                                      |
| Project URL          | `https://mqfiocolakvqkpvxlafk.supabase.co`                  |
| Region               | `us-east-1`                                                 |
| Used for             | Auth, PostgreSQL, Storage                                   |
| Required public vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Required server vars | `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`                 |
| Schema source        | `packages/database/migrations`                              |

## Vercel

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| Production URL | `https://job-globe-com-web.vercel.app/` |
| Project name   | `job-globe-com-web`                     |
| Owner          | `vishalgwu`                             |
| App directory  | `apps/web`                              |
| Framework      | Next.js                                 |
| Expected build | `npm --workspace apps/web run build`    |

## GitHub

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| Repository       | `vishalgwu/job-globe.com`              |
| Main branch      | `main`                                 |
| CI workflow      | `.github/workflows/ci.yml`             |
| Staging workflow | `.github/workflows/deploy-staging.yml` |

## Local Environment

- Root `.env` is private and ignored by Git.
- `.env.example` is the safe root template.
- `packages/config/environments/*.env.example` contains environment-specific templates.
- Docker Compose uses root `.env` for local services.

## Status Notes

- Web deploy is connected to Vercel.
- CI validates web, workers, and database migrations.
- Terraform files are placeholders and do not currently provision infrastructure.
- Use `docs/md/INFRASTRUCTURE.md` for current infrastructure status.
