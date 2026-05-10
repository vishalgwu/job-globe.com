# Shared Packages Module

## Module Name and Purpose

Shared packages: `packages/shared-types`, `packages/config`

These packages keep contracts and environment templates in one place so web, workers, scripts, and documentation can use consistent names.

## What Is Completed

- TypeScript shared contracts for jobs, companies, locations, matches, and profiles.
- Python contract files exist for the same domains.
- Environment examples exist for development, staging, and production.
- Root package exports `@job-globe/shared-types` for the web app.

## What Is In Progress

- Some Python shared contract files are still minimal placeholders.
- Config package is template-focused, not a runtime configuration library.

## What Is Remaining

- Expand Python shared contracts only when worker code needs them directly.
- Add stronger schema validation if API contracts start changing frequently.
- Keep environment templates aligned with `.env.example` and worker settings.

## How It Works

The web app imports TypeScript types from `@job-globe/shared-types`. Worker code mostly uses Pydantic models and local repository types, with Python shared contracts available for future alignment. Environment templates document expected variables by deployment target.

## Key Files

- `packages/shared-types/typescript/index.ts`
- `packages/shared-types/typescript/job.ts`
- `packages/shared-types/typescript/profile.ts`
- `packages/shared-types/typescript/match.ts`
- `packages/shared-types/python/*.py`
- `packages/config/environments/*.env.example`
- `packages/config/README.md`

## Dependencies and Integrations

- TypeScript path/workspace package imports
- Python Pydantic for future contract expansion
- Root `.env.example`
- Worker `settings.py`
