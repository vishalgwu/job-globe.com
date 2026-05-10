# Workers Module

## Module Name and Purpose

Workers / backend pipeline: `apps/workers`

The worker plane is a Python package that discovers jobs from external sources, validates and enriches them, then writes canonical job records to PostgreSQL for the web app to read.

## What Is Completed

- Packaged worker source under `apps/workers/src/job_globe_workers`.
- Discovery runner with freshness checks.
- 7 active source connectors: Greenhouse, Lever, Adzuna, USA Jobs, EURES, Workable, SmartRecruiters.
- URL verification and trust scoring.
- Company identity resolution.
- Geo mapping with city centroids and country fallback.
- Rule-based taxonomy tagging.
- Duplicate detection and canonical job upsert.
- Redis Streams producer/consumer.
- PostgreSQL connection pool and repository layer.
- Worker health logging.
- pytest, ruff, and mypy configuration.

## What Is In Progress

- Production observability beyond logs and simple metrics.
- Cleanup of older top-level placeholder folders under `apps/workers`.

## What Is Remaining

- Alert delivery worker, if email alerts are required.
- Resume NLP extraction worker.
- Embedding generation for jobs and profiles.
- Real cloud runtime setup for workers outside local Docker/CI.

## How It Works

The worker process starts from `job_globe_workers.main`. It launches threads for discovery, verification, company identity, duplicate detection, and health logging. Discovery publishes raw jobs to Redis Streams. Verification checks apply URLs and writes raw jobs. Downstream workers enrich company/location/taxonomy data and the duplicate detector writes canonical job records.

The active implementation is in `apps/workers/src/job_globe_workers`. Some similarly named files directly under `apps/workers/agents`, `apps/workers/scoring`, and related folders are legacy placeholders or older stubs unless imported by the package.

## Key Files

- `apps/workers/src/job_globe_workers/main.py`
- `apps/workers/src/job_globe_workers/settings.py`
- `apps/workers/src/job_globe_workers/agents/discovery/*`
- `apps/workers/src/job_globe_workers/agents/verification/*`
- `apps/workers/src/job_globe_workers/agents/company_identity/*`
- `apps/workers/src/job_globe_workers/agents/geo_mapping/geocoder.py`
- `apps/workers/src/job_globe_workers/agents/categorisation/tagger.py`
- `apps/workers/src/job_globe_workers/agents/duplicate_detection/detector.py`
- `apps/workers/src/job_globe_workers/db/repositories/*`
- `apps/workers/tests/*`

## Dependencies and Integrations

- Python 3.11+
- httpx, pydantic, pydantic-settings, psycopg, psycopg-pool, redis, structlog
- PostgreSQL with pgvector
- Redis Streams
- External job APIs
- Optional OpenAI/API credentials for future embedding work
