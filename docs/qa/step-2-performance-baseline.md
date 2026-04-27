# Step 2 Performance Baseline

Status: Local build baseline completed; browser Lighthouse baseline still requires a running browser/device or staging URL.

Date: 2026-04-27

## Implementation Decisions

- Heavy live globe libraries are not loaded by the first Step 2 demo UI route.
- The route uses a lightweight DOM/CSS globe visualization backed by the demo Search API.
- Demo data is local and small, so API response time is expected to be well under the 200 ms target in local/staging environments.
- The 2D fallback mode is built into the same route and can be forced from the UI.

## Local Verification

| Check                         | Result |
| ----------------------------- | ------ |
| `npm.cmd run typecheck`       | Pass   |
| `npm.cmd run lint`            | Pass   |
| `npm.cmd run build`           | Pass   |
| `npm.cmd run migration:check` | Pass   |
| Local page smoke              | Pass   |
| Local `/api/jobs` smoke       | Pass   |
| Local `/api/profile` smoke    | Pass   |

## Lighthouse Targets

| Metric            | Target                            | Current Status                      |
| ----------------- | --------------------------------- | ----------------------------------- |
| LCP               | < 2.5s on fast 3G                 | Not measured locally                |
| TTI               | < 4s                              | Not measured locally                |
| TBT               | < 200ms                           | Not measured locally                |
| Initial JS bundle | < 500KB gzipped, or ADR if missed | Needs browser/build analyzer pass   |
| Search API p95    | < 200ms on demo data              | Needs timed request pass in staging |

## Follow-Up Before Step 3

- Run Lighthouse against the Vercel staging deployment.
- Record Chrome performance numbers for desktop and mobile viewport.
- Run a timed API smoke check for `/api/jobs?mode=global`, `/api/jobs?mode=city`, and `/api/jobs?mode=detail&id=demo-job-001`.
- Add an ADR only if the final measured initial JS bundle exceeds the 500KB gzip target.
