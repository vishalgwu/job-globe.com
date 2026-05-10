# Phase 5 Browser and Device QA

Last updated: 2026-05-10

This document records browser and device compatibility evidence for the production deployment.

## Test matrix

| Browser / Device | Version | Globe renders | Auth flow | Job list | Job detail | Onboarding | Saved jobs | Alerts | Applications |
|---|---|---|---|---|---|---|---|---|---|
| Chrome (desktop) | 124+ | — | — | — | — | — | — | — | — |
| Firefox (desktop) | 125+ | — | — | — | — | — | — | — | — |
| Safari (desktop, macOS) | 17+ | — | — | — | — | — | — | — | — |
| Edge (desktop) | 124+ | — | — | — | — | — | — | — | — |
| Safari (iOS 17, iPhone 15) | — | — | — | — | — | — | — | — | — |
| Chrome (Android 14) | — | — | — | — | — | — | — | — | — |

Legend: ✅ pass · ❌ fail · ⚠️ degraded · — not yet tested

## Responsive breakpoints

| Breakpoint | Expected behaviour |
|---|---|
| < 640px (mobile) | Globe fills viewport, job panel slides up from bottom |
| 640–1024px (tablet) | Side-by-side layout begins |
| > 1024px (desktop) | Full globe + side panel layout |

## Known browser-specific considerations

- WebGL: All modern browsers support WebGL 2. iOS Safari 16 and below may fall back to the `FallbackMap` component.
- CSS variables: Used throughout; fully supported in all listed browsers.
- `navigator.locks` (Supabase SSR): Available in Chrome 69+, Firefox 96+, Safari 15.4+. No fallback needed for the target matrix.

## How to run QA

1. Deploy the branch to staging (or use the Vercel preview URL).
2. Open each browser listed above.
3. Navigate to the production URL, complete each flow listed in the matrix.
4. Mark each cell ✅, ❌, or ⚠️ and record any issues with browser version and a screenshot.
5. File issues for any ❌ or ⚠️ cells before launch.

## Status

Browser QA against production is pending. Update this document with real results before marking Phase 5 complete.
