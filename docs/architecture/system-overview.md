# System Overview

Jarvis Job Globe is split into a web exploration app, a Python worker plane, and shared packages.

- `apps/web` renders the globe, auth, onboarding, profile, alerts, and job panel experiences.
- `apps/workers` owns source discovery, verification, company identity, geo mapping, categorization, duplicate detection, ranking, profile parsing, application handling, and alerting.
- `packages/database` owns the PostgreSQL schema, seeds, and validation scripts.
- `packages/shared-types` holds contracts used by the frontend and workers.
- `infra` defines local Docker, cloud infrastructure placeholders, and operational scripts.
