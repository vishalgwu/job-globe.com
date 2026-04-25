# ADR-003: Globe Library

## Status
Accepted for Step 1

## Decision
Use Globe.GL as the high-level globe renderer, with React Three Fiber and Three.js available for lower-level scene composition and deck.gl available for overlay layers.

## Context
The product needs 3D globe exploration, heatmap-style demand overlays, and lower-power fallback paths in later steps.

## Consequences
Step 1 installs dependency declarations and creates placeholder component boundaries. Step 2 owns the interactive implementation and performance fallback testing.
