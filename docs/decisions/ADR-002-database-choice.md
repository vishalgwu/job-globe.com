# ADR-002: Database Choice

## Status
Accepted for Step 1

## Decision
Use PostgreSQL 15 with the pgvector extension for canonical product data, full-text search, audit logs, and embedding storage.

## Context
The plan needs relational integrity, GIN full-text indexes, JSONB metadata, and vector similarity search for job and profile embeddings.

## Consequences
Local development uses `pgvector/pgvector:pg15`. Migrations must be idempotent and include both relational tables and vector columns.
