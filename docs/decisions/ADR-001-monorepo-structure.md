# ADR-001: Monorepo Structure

## Status
Accepted for Step 1

## Decision
Use a monorepo with `apps/web`, `apps/workers`, `packages/database`, `packages/shared-types`, `packages/config`, `infra`, and `docs`.

## Context
The build plan requires a Next.js frontend, a Python worker plane, shared schemas, shared config, and infrastructure code. Application folders must not import directly from other application folders.

## Consequences
Shared contracts and configuration live in `packages`. The folder boundary is visible from the first commit, and later work can add implementation without restructuring the repository.
