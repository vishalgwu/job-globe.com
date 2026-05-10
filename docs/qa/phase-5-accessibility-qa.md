# Phase 5 Accessibility QA

Last updated: 2026-05-10

This document records accessibility QA evidence for the production deployment, covering screen reader compatibility and keyboard navigation.

## Screen readers tested

| Tool | Platform | Status |
|---|---|---|
| VoiceOver | macOS / iOS | — pending |
| NVDA | Windows | — pending |
| JAWS | Windows | — pending |

## Keyboard navigation checklist

| Flow | Tab order correct | Focus visible | Escape closes overlays | Enter/Space activates buttons |
|---|---|---|---|---|
| Globe exploration | — | — | — | — |
| Job list navigation | — | — | — | — |
| Job detail panel | — | — | — | — |
| Login / register forms | — | — | — | — |
| Onboarding flow | — | — | — | — |
| Resume upload | — | — | — | — |
| Saved jobs | — | — | — | — |
| Alerts management | — | — | — | — |
| Applications list | — | — | — | — |

## Automated axe-core scan

Run `npx axe-cli https://job-globe-com-web.vercel.app/` against each key page and record the violation count here.

| Page | Critical violations | Serious violations | Moderate violations |
|---|---|---|---|
| Globe (home) | — | — | — |
| Login | — | — | — |
| Register | — | — | — |
| Onboarding | — | — | — |
| Profile | — | — | — |
| Saved jobs | — | — | — |
| Alerts | — | — | — |
| Applications | — | — | — |

## WCAG 2.1 AA commitments

- All interactive elements have accessible names (aria-label or visible text).
- All images have meaningful alt text or are marked aria-hidden="true".
- Colour contrast ratios meet AA minimums (4.5:1 for normal text, 3:1 for large text).
- Form errors are announced via aria-live or role="alert".
- The globe canvas has a text fallback for screen reader users explaining what it shows.

## Status

Accessibility QA is pending live testing. Update this document before marking Phase 5 complete.
