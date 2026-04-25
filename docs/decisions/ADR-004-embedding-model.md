# ADR-004: Embedding Model

## Status
Proposed for Step 4

## Decision
Default to `text-embedding-3-small` with 1536 dimensions for Step 1 schema compatibility.

## Context
Step 1 only needs schema and configuration readiness. Step 4 will validate quality and cost before final model acceptance.

## Consequences
Embedding tables use `vector(1536)`. A future ADR must be written if the model or dimensions change.
