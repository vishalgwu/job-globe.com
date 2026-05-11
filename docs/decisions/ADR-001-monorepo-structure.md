# ADR-001: Monorepo Structure

## Status

Accepted and still current.

## Decision

Use a monorepo with `apps/web`, `apps/workers`, `packages/database`, `packages/shared-types`, `packages/config`, `infra`, and `docs`.

## Context

The build plan requires a Next.js frontend, a Python worker plane, shared schemas, shared config, and infrastructure code. Application folders must not import directly from other application folders.

## Current Implementation Notes

The repository follows this structure. The active worker package lives under `apps/workers/src/job_globe_workers`. Some older top-level folders under `apps/workers` contain placeholders and should not be treated as active shared modules.

## Consequences

Shared contracts and configuration live in `packages`. Application folders should not import directly from one another.
