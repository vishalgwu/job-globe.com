# ADR-004: Embedding Model

## Status

Proposed for Step 4. Schema-ready, not active in the product.

## Decision

Default to `text-embedding-3-small` with 1536 dimensions for Step 1 schema compatibility.

## Context

Step 1 only needs schema and configuration readiness. Step 4 will validate quality and cost before final model acceptance.

## Current Implementation Notes

The database has `job_embeddings` and `profile_embeddings` tables using `vector(1536)`. The web scorer can blend a supplied embedding score, but no worker currently generates or stores embeddings.

## Consequences

Embedding tables use `vector(1536)`. A future ADR must be written if the model, dimensions, or provider changes.
