# Database Module

## Module Name and Purpose

Database: `packages/database`

The database module contains SQL migrations, seed data, and validation/apply scripts for the PostgreSQL schema used by the web app and workers.

## What Is Completed

- 13 ordered SQL migrations.
- Tables for users, profiles, resume extractions, companies, locations, raw jobs, canonical jobs, taxonomy, embeddings, saved jobs, applications, alerts, agent runs, and audit events.
- Seed files for taxonomy and demo jobs.
- Migration validation script.
- Migration apply script.
- CI database job that applies migrations and validates expected table/migration counts.

## What Is In Progress

- Production data operations and backup/restore runbooks are not fully represented in this repo.
- Embedding and resume extraction tables exist before the full pipelines are implemented.

## What Is Remaining

- Confirm production/staging migration process documentation after launch.
- Add any missing indexes discovered by production query monitoring.
- Decide whether alert subscriptions need additional delivery tables.

## How It Works

Migrations are stored in `packages/database/migrations` and are applied in filename order. `validate_migrations.py` checks expected names and schema expectations. `apply_migrations.py` applies migrations against `DATABASE_URL` and records migration history in `schema_migrations`.

The web app reads and writes through Supabase clients. Workers write through psycopg repository functions.

## Key Files

- `packages/database/migrations/*.sql`
- `packages/database/seeds/demo_jobs.sql`
- `packages/database/seeds/taxonomy_reference.sql`
- `packages/database/scripts/validate_migrations.py`
- `packages/database/scripts/apply_migrations.py`

## Dependencies and Integrations

- PostgreSQL 15
- pgvector extension
- Supabase hosted PostgreSQL in staging/production
- GitHub Actions database service for CI
