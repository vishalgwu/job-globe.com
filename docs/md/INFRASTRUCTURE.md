# Infrastructure Module

## Module Name and Purpose

Infrastructure and DevOps: `infra`, `.github`, root scripts

This module defines local development services, container builds, CI checks, and deployment handoff.

## What Is Completed

- Docker Compose for local development and test service setup.
- Dockerfiles for web and workers.
- GitHub Actions CI for web, workers, and database.
- Deployment placeholder workflow for staging.
- Vercel deployment is connected from `main`.
- Environment examples exist for local/staging/production.

## What Is In Progress

- Staging deployment automation is a placeholder.
- Branch protection is documented but should be verified in GitHub settings.
- Production observability and alerting are not fully automated from this repo.

## What Is Remaining

- Replace Terraform placeholders with real modules or remove them.
- Add a real worker deployment target for staging/production.
- Record production rollback steps in the centralized docs if deployment ownership changes.
- Complete launch QA evidence.

## How It Works

Local development uses Docker Compose to run PostgreSQL, Redis, the web app, and workers. CI runs on GitHub Actions after pushes and pull requests. The web app is expected to deploy through Vercel from the `main` branch.

## Key Files

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/CODEOWNERS`
- `infra/docker/docker-compose.dev.yml`
- `infra/docker/docker-compose.test.yml`
- `infra/docker/Dockerfile.web`
- `infra/docker/Dockerfile.workers`
- `infra/scripts/*`
- `infra/terraform/*`
- `.env.example`
- `packages/config/environments/*.env.example`

## Dependencies and Integrations

- Docker Desktop / Docker Compose
- GitHub Actions
- Vercel
- Supabase
- Redis
- PostgreSQL with pgvector
