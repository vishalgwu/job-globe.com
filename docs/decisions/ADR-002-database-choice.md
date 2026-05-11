# ADR-002: Database Choice

## Status

Accepted and still current.

## Decision

Use PostgreSQL 15 with the pgvector extension for canonical product data, full-text search, audit logs, and embedding storage.

## Context

The plan needs relational integrity, GIN full-text indexes, JSONB metadata, and vector similarity search for job and profile embeddings.

## Current Implementation Notes

The repo has 13 idempotent migrations. They create the expected app tables, enable pgvector, and include GIN/full-text/vector indexes. The embedding tables exist, but the embedding generation pipeline is not active yet.

## Consequences

Local development uses `pgvector/pgvector:pg15`. Migrations must stay ordered, idempotent, and validated by CI.
