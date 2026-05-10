# Phase 5 Lighthouse Performance Baseline

Last updated: 2026-05-10

This document records Lighthouse performance scores for the production deployment. Scores were captured against `https://job-globe-com-web.vercel.app/` using Chrome DevTools Lighthouse (desktop preset, no throttling, cold cache).

## Measurement methodology

- Tool: Chrome DevTools Lighthouse 12.x, desktop preset
- Network: unthrottled
- CPU: unthrottled
- Cache: cleared before each run
- Runs: 3 runs, median score recorded
- Date: 2026-05-10

## Scores

| Category | Score | Target |
|---|---|---|
| Performance | — | ≥ 70 |
| Accessibility | — | ≥ 90 |
| Best Practices | — | ≥ 90 |
| SEO | — | ≥ 80 |

> Scores marked — are pending a live measurement run against the production URL. This document should be updated with real values before Phase 5 is considered fully complete. The globe (Three.js/WebGL) render is expected to lower the Performance score on mobile; desktop is the primary target for initial baseline.

## Key metrics to record

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

## Known performance considerations

- The globe canvas (Three.js + globe.gl) is dynamically imported with `next/dynamic` to prevent SSR and avoid adding Three.js to the initial bundle.
- The `FallbackMap` component renders for users without WebGL support.
- Job list data is fetched client-side to avoid blocking the initial HTML response.

## Next steps

Run Lighthouse against production, record actual values in the table above, and open a follow-up issue for any category scoring below its target.
