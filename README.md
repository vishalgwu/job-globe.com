# job-globe.com

Job Globe is structured as a monorepo for the Jarvis Job Globe build plan.

## Repository Layout

- `apps/web` - Next.js frontend application shell
- `apps/workers` - Python background worker plane and agents
- `packages/database` - SQL migrations, seeds, and schema snapshots
- `packages/shared-types` - TypeScript and Python contracts shared across apps
- `packages/config` - Shared environment and feature flag configuration
- `infra` - Local Docker, Terraform, deployment, migration, and seed scripts
- `docs` - ADRs, architecture notes, API contracts, and runbooks

The build plan requires application folders to avoid importing directly from each other. Shared logic belongs in `packages`.
