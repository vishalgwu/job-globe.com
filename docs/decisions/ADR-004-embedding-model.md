# ADR-004: Embedding Model

## Status

Accepted for current schema and worker implementation. Product integration is still partial.

## Decision

Default to `text-embedding-3-small` with 1536 dimensions for Step 1 schema compatibility.

## Context

Step 1 only needs schema and configuration readiness. Step 4 will validate quality and cost before final model acceptance.

## Current Implementation Notes

The database has `job_embeddings` and `profile_embeddings` tables using `vector(1536)`. Worker modules exist for generating `text-embedding-3-small` vectors for jobs and profiles.

The web scorer can blend a supplied embedding score, but the live job-detail path does not call `fetchEmbeddingScore()` yet. In other words, embeddings are stored/scaffolded, but they are not currently part of user-facing match scores.

## Consequences

Embedding tables use `vector(1536)`. A future ADR must be written if the model, dimensions, or provider changes. A follow-up implementation decision is still needed for how web/API scoring retrieves, blends, caches, and explains embedding similarity.
