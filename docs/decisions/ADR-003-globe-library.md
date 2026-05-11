# ADR-003: Globe Library

## Status

Accepted direction, partially implemented.

## Decision

Use Globe.GL as the intended high-level globe renderer, with React Three Fiber and Three.js available for lower-level scene composition and deck.gl available for overlay layers.

## Context

The product needs 3D globe exploration, heatmap-style demand overlays, and lower-power fallback paths in later steps.

## Current Implementation Notes

The dependencies are installed, but the active globe UI currently uses React/CSS components and image assets in `GlobeCanvas` and `FallbackMap`. It does not currently render the main experience through Globe.GL, React Three Fiber, or deck.gl heatmap layers.

## Consequences

Future globe work should either complete the planned renderer integration or update this ADR to accept the custom React/CSS renderer as the product direction.
