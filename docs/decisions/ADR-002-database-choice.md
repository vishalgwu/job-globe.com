# ADR-002: Database Choice

## Status

Accepted and still current.

## Decision

Use PostgreSQL 15 with the pgvector extension for canonical product data, full-text search, audit logs, and embedding storage.

## Context

The plan needs relational integrity, GIN full-text indexes, JSONB metadata, and vector similarity search for job and profile embeddings.

## Current Implementation Notes

The repo has 16 idempotent migrations and 21 application tables. The migration validation script currently passes and confirms pgvector, GIN indexes, resume uniqueness, alert deliveries, notifications, quick-prep cache, and audit retention policies.

Embedding tables exist and worker modules generate job/profile embeddings, but the live web match-scoring path does not yet read those embeddings. The database is ready for semantic matching; the product integration is still in progress.

## Consequences

Local development uses `pgvector/pgvector:pg15`. Migrations must stay ordered, idempotent, and validated by CI. The CI workflow must be updated to assert the current 16 migration files and 21 tables.
