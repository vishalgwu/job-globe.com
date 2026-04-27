# Step 2 Implementation README

Status: Ready to start after Step 1 completion.

Primary goal: build the user-facing Job Globe experience with demo/staging data before the real data pipeline begins in Step 3.

Step 2 is the product UX step. By the end, a user should be able to open the deployed app, explore jobs through the globe on desktop and mobile, use the job panel, save a job, and complete onboarding. Live data agents are not required in Step 2.

## Start Here

Before writing code in the next chat, confirm these basics:

```powershell
cd C:\college\Github\Projects\job-globe.com
git status --short
npm.cmd install
npm.cmd run verify:step1
.\.venv-job-globe\Scripts\python.exe -m ruff check apps\workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps\workers\src
.\.venv-job-globe\Scripts\python.exe -m pytest -p no:cacheprovider apps\workers\tests
```

Important:

- Do not commit `.env`, `.env.local`, service role keys, database URLs, or API secrets.
- Use demo data and Supabase staging data only.
- Do not build live source connectors or agent ingestion in Step 2. That belongs to Step 3.
- Keep `main` protected. Work on a branch and open a pull request.

## Current Step 2 Starting Point

The repo already has the folders and placeholders needed for Step 2.

Main frontend files:

- `apps/web/app/(globe)/page.tsx`
- `apps/web/components/globe/GlobeCanvas/GlobeCanvas.tsx`
- `apps/web/components/globe/FallbackMap/`
- `apps/web/components/globe/IntroOverlay/`
- `apps/web/components/globe/ZoomController/`
- `apps/web/components/globe/BubbleLayer/`
- `apps/web/components/job-panel/JobPanel/JobPanel.tsx`
- `apps/web/components/job-panel/ApplyCTA/`
- `apps/web/components/job-panel/MatchBreakdown/`
- `apps/web/components/job-panel/QuickPrepToolkit/`
- `apps/web/app/(auth)/onboarding/page.tsx`
- `apps/web/components/onboarding/OnboardingFlow/OnboardingFlow.tsx`
- `apps/web/components/onboarding/QuestionStep/`
- `apps/web/components/onboarding/ResumeUpload/`
- `apps/web/stores/globeStore.ts`
- `apps/web/stores/jobStore.ts`
- `apps/web/stores/userStore.ts`

API files:

- `apps/web/app/api/jobs/route.ts`
- `apps/web/app/api/profile/route.ts`
- `docs/api/jobs-api.md`
- `docs/api/profile-api.md`

Design and QA references:

- `apps/web/app/globals.css`
- `apps/web/components/ui/`
- `docs/design/wireframe-approval-notes.md`
- `docs/qa/testing-conventions.md`
- `docs/qa/step-1-completion-report.md`

## Step 2 Success Criteria

Step 2 is successful when:

- The landing/globe screen is live on staging.
- The globe loads in under 3 seconds on a mid-range laptop.
- Four zoom layers work: global, country, city, neighbourhood.
- The right-side job panel opens and shows all job fields.
- The Apply CTA opens a valid external placeholder apply URL in a new tab.
- Save Job works for anonymous and logged-in users.
- Onboarding has 6-8 questions and saves to `profiles`.
- The resume upload UI exists with consent text, but real parsing is still a placeholder.
- A 2D fallback map loads when WebGL is unavailable.
- Keyboard navigation, focus rings, and color contrast pass WCAG 2.1 AA.
- Reduced motion users do not get forced animated transitions.
- Lighthouse performance targets are documented.

## Build Order

### 1. Create Step 2 Branch

Use a branch because `main` is protected.

```powershell
git switch main
git pull origin main
git switch -c codex/step-2-globe-ux
```

If the Step 1 docs PR is still open, either merge it first or branch from the Step 1 docs branch after confirming with the project owner.

### 2. Stabilize Data Contracts First

Goal: make the frontend and API agree on one shape for globe data, job summaries, and profile saves.

Create or update shared TypeScript types in `packages/shared-types`.

Recommended contracts:

- `GlobeZoomLayer`: `global | country | city | neighbourhood`
- `JobSummary`
- `JobDetail`
- `GlobeCountryDatum`
- `GlobeCityDatum`
- `GlobeCompanyBubble`
- `GlobeMarker`
- `SearchFilters`
- `OnboardingAnswers`

Update docs:

- `docs/api/jobs-api.md`
- `docs/api/profile-api.md`

Acceptance check:

- TypeScript can import these types from the web app.
- API docs match the actual route response shape.

### 3. Build Demo Search API

Goal: give the globe real structured demo data from the Step 1 schema.

Update:

- `apps/web/app/api/jobs/route.ts`

Minimum endpoints/query modes:

- Global density by country.
- Country summary with top categories and top metro areas.
- City/company bubble list.
- Job list filtered by category, location, remote type, and job type.
- Single job detail by id, if needed by the panel.

Expected performance target:

- Tile/search query p95 under 200ms with demo data.

Implementation note:

- Prefer structured SQL queries against Supabase/staging or local Postgres.
- Keep a fallback static demo payload only if local DB credentials are unavailable.
- Do not hardcode secrets. Read from environment variables only.

Acceptance check:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

### 4. Build Profile API Stub

Goal: onboarding answers can be saved.

Update:

- `apps/web/app/api/profile/route.ts`

Minimum behavior:

- Accept onboarding answers.
- Validate required fields.
- Save to `profiles` when a user/session is available.
- Return a clean success response.
- If auth is not fully wired for the local test path, support a safe demo-mode response without pretending it is production auth.

Acceptance check:

- Onboarding can submit without crashing.
- Bad payloads return a useful validation error.
- No secret or raw resume content is logged.

### 5. Build App State

Goal: centralize the globe, filter, selected job, and panel state.

Update:

- `apps/web/stores/globeStore.ts`
- `apps/web/stores/jobStore.ts`
- `apps/web/stores/userStore.ts`

State to support:

- Active zoom layer.
- Selected country/city/company/job.
- Filter values.
- Search text.
- Loading/error states.
- Job panel open/closed state.
- Anonymous saved jobs in session storage.

Acceptance check:

- Changing filters does not reload the full page.
- Selecting globe objects updates the panel predictably.
- Anonymous saved jobs survive page refresh in the same browser session.

### 6. Build Globe Landing Screen

Goal: replace the Step 1 placeholder with the real first screen.

Update:

- `apps/web/app/(globe)/page.tsx`
- `apps/web/components/globe/GlobeCanvas/GlobeCanvas.tsx`
- `apps/web/components/globe/IntroOverlay/`
- `apps/web/components/globe/ZoomController/`
- `apps/web/components/filters/`

Required UX:

- Immersive globe is the main screen, not a marketing landing page.
- CTAs are functional: explore jobs, start onboarding, view saved jobs/profile.
- Intro animation is muted by default.
- `prefers-reduced-motion` disables dramatic camera movement.
- Desktop and mobile layouts both work.

Design notes:

- Use visual assets or real globe rendering, not a static text placeholder.
- Do not put the whole globe experience inside a decorative card.
- Keep controls compact, readable, and keyboard accessible.

Acceptance check:

- User can load the home route and interact with the globe shell.
- No overlapping text/buttons at desktop or mobile sizes.
- The route builds in Next.js.

### 7. Implement Four Globe Layers

Goal: provide the core interactive globe model.

Layer 1: Global

- Render a global heatmap from country-level job counts.
- Show demand density, not company logos.
- Country boundaries or regions should visually indicate demand.

Layer 2: Country

- On country click or zoom, show country summary.
- Include total jobs, top 3 categories, and top 5 metro areas.
- Open the right-side panel with the country summary.

Layer 3: City

- Render company bubbles sized by current posting count.
- Show logos for top 10-15 employers where available.
- Hover shows employer name, posting count, and top category.
- Click opens employer detail in the panel.

Layer 4: Neighbourhood

- Switch from clusters to precise company/job markers.
- Show role snippets, salary hints where available, and remote/on-site signals.
- Panel becomes fully job-operational here.

Acceptance check:

- All four layers can be reached.
- Transitions are smooth when motion is allowed.
- Reduced motion mode uses instant or minimal transitions.
- Filters update the visible globe data in real time.

### 8. Build Filter And Search Controls

Goal: users can narrow the visible data without losing context.

Filters:

- Category.
- Country/city.
- Remote mode: remote, hybrid, on-site.
- Job type: internship, new-grad, full-time, contract.

Search:

- Free-text search highlights matching companies and roles.
- Search should not reset zoom unless the user explicitly clears or recenters.

Acceptance check:

- Filters call the Search API.
- Results update without full page reload.
- Empty states are visible and useful.

### 9. Build Right-Side Job Panel

Goal: make the selected job or employer understandable and actionable.

Update:

- `apps/web/components/job-panel/JobPanel/JobPanel.tsx`
- `apps/web/components/job-panel/ApplyCTA/`
- `apps/web/components/job-panel/MatchBreakdown/`
- `apps/web/components/job-panel/QuickPrepToolkit/`

Required fields:

- Job title.
- Company name and logo.
- Location.
- Employment type.
- Salary range, if available.
- Posted date.
- Freshness indicator.
- One-paragraph role summary.
- Verified Opening header.
- Trust line: `Redirects to the official application portal`.

Required CTAs:

- `Apply on Official Site`: opens valid apply URL in a new tab.
- `Save Job`: works for anonymous and logged-in users.
- `Why This Matches You`: placeholder in Step 2, real scoring in Step 4.

Quick-Prep placeholder accordion:

- Role summary.
- Skills I have vs. skills missing.
- Three interview questions.
- Company brief.
- Resume tailoring note.

Acceptance check:

- Panel opens, closes, and traps focus when appropriate.
- Apply URL is validated before rendering.
- Save Job updates UI state.
- Empty, loading, and error states exist.

### 10. Build Onboarding Flow

Goal: collect the user profile inputs needed for future matching.

Update:

- `apps/web/app/(auth)/onboarding/page.tsx`
- `apps/web/components/onboarding/OnboardingFlow/OnboardingFlow.tsx`
- `apps/web/components/onboarding/QuestionStep/`
- `apps/web/components/onboarding/ResumeUpload/`

Questions:

- Desired role family.
- Target locations.
- Remote/hybrid/on-site preference.
- Job type: internship, full-time, contract.
- Salary sensitivity, optional.
- Company size preference.
- Time-to-start.
- Work authorization, optional and skippable.

Flow requirements:

- 6-8 steps.
- Clear progress indicator: `Step N of M`.
- User can exit and resume.
- On completion, save answers through Profile API.
- Resume upload UI appears with Legal/Privacy-approved consent text.
- Resume file parsing stays placeholder-only in Step 2.

Acceptance check:

- Flow completes without errors.
- Required questions validate clearly.
- Optional questions have visible skip controls.
- Completion writes or simulates a safe profile save depending on auth state.

### 11. Build 2D Fallback Map

Goal: support users who cannot use WebGL.

Update:

- `apps/web/components/globe/FallbackMap/`
- `apps/web/lib/accessibility/`

Requirements:

- Detect WebGL support on page load.
- If unsupported, render a 2D map automatically.
- On mobile, default to 2D if WebGL performance is weak.
- Keep all four zoom layers.
- Filters and job panel must work the same as the globe.

Implementation note:

- Leaflet is recommended by the build plan. Add `leaflet` and `react-leaflet` only if needed and document the dependency.

Acceptance check:

- A manual toggle or test hook can force fallback mode.
- Fallback mode supports search, filters, selected jobs, and panel actions.

### 12. Accessibility Audit

Goal: make the product usable without mouse-only or vision-only interaction.

Requirements:

- Every interactive element is keyboard accessible.
- Visible focus rings exist.
- Body text contrast is at least 4.5:1.
- Large text contrast is at least 3:1.
- Canvas has a screen-reader alternative: list mode or skip link to job list.
- Motion respects `prefers-reduced-motion`.
- No sound plays by default.

Recommended tools:

- Lighthouse accessibility audit.
- axe if added to tests.
- Manual keyboard-only pass.
- VoiceOver and NVDA manual checks when possible.

Create:

- `docs/qa/step-2-accessibility-audit.md`

Acceptance check:

- No blocking accessibility issues remain.
- Known non-blocking issues are documented with owner and follow-up step.

### 13. Performance Baseline

Goal: prove the demo product is fast enough before Step 3 adds real data.

Measure:

- LCP under 2.5s on fast 3G.
- TTI under 4s.
- TBT under 200ms.
- Initial JS bundle under 500KB gzipped.
- Search API p95 under 200ms on demo data.

Implementation notes:

- Dynamically import heavy globe libraries where possible.
- Avoid loading Three.js, Globe.GL, deck.gl, and map libraries on routes that do not need them.
- Keep first render useful even while the globe bundle loads.

Create:

- `docs/qa/step-2-performance-baseline.md`

Acceptance check:

- Lighthouse report values are recorded.
- Bundle size decision is documented.
- Any missed target has a follow-up issue before Step 3.

## Testing Checklist

Run these before opening the Step 2 PR:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run migration:check
.\.venv-job-globe\Scripts\python.exe -m ruff check apps\workers
.\.venv-job-globe\Scripts\python.exe -m mypy apps\workers\src
.\.venv-job-globe\Scripts\python.exe -m pytest -p no:cacheprovider apps\workers\tests
```

Also manually test:

- Desktop Chrome.
- Desktop Firefox.
- Desktop Safari if available.
- Mobile viewport.
- Keyboard-only navigation.
- Reduced motion mode.
- Forced 2D fallback mode.
- Anonymous Save Job.
- Onboarding completion.
- Live Vercel staging deployment.

## Step 2 Definition Of Done

Step 2 is not complete until every item below is done:

- Landing screen is live on staging with all primary CTAs functional.
- Immersive intro works, respects reduced motion, and is muted by default.
- All four zoom layers render without visual errors on Chrome, Firefox, and Safari.
- Zoom transitions are smooth and do not cause layout shifts.
- Filter bar updates globe data without full page reload.
- Search highlights matching companies and jobs without losing zoom context.
- Right-side job panel opens, displays all fields, and has a correct Apply CTA.
- Save Job works for anonymous and logged-in users.
- Onboarding flow completes and saves to `profiles`.
- Resume upload UI shows approved consent copy and placeholder parsing state.
- 2D fallback map loads when WebGL is unavailable and has feature parity.
- All interactive elements are keyboard accessible with visible focus rings.
- WCAG 2.1 AA color contrast passes.
- Globe canvas has a screen-reader-accessible list mode.
- Lighthouse targets are met or misses are documented and accepted.
- Initial JS bundle is under 500KB gzipped, or an ADR explains why not.
- API docs match implementation.
- Figma/design approval is recorded if new high-fidelity designs are introduced.
- Legal/Privacy approval is recorded for resume upload consent text.

## Step 2 To Step 3 Handoff

At the end of Step 2, prepare these artifacts:

| Artifact | Location | Receiver |
| --- | --- | --- |
| Working globe on staging with all four layers | Vercel URL + screen recording | Backend and Data/ML |
| Search API contract | `docs/api/jobs-api.md` | Data/ML |
| Profile API contract | `docs/api/profile-api.md` | Data/ML |
| Accessibility audit | `docs/qa/step-2-accessibility-audit.md` | All roles |
| Performance baseline | `docs/qa/step-2-performance-baseline.md` | All roles |
| Consent notice copy | `docs/decisions/privacy-framework.md` or linked doc | Backend and Legal/Privacy |
| Step 2 completion report | `docs/qa/step-2-completion-report.md` | Product Owner |

## Recommended First Prompt For The Next Chat

Use this prompt to continue:

```text
We are in C:\college\Github\Projects\job-globe.com. Step 1 is complete. Read docs/qa/step-2-implementation-readme.md, inspect the current Next.js app, and begin Step 2 in order. Start with data contracts, the demo Search API, and the globe state store. Do not commit .env or secrets. Work on a branch from main and keep changes scoped.
```

## Notes For The Next Chat

- Step 2 is mostly frontend, but it needs small API/data work to make the UX real.
- Build the experience with demo/staging data first.
- Keep real ingestion agents for Step 3.
- Prefer small PRs if Step 2 becomes large:
  - PR 1: data contracts and Search/Profile APIs.
  - PR 2: globe shell, state, filters, and layers.
  - PR 3: job panel and save behavior.
  - PR 4: onboarding and resume upload placeholder.
  - PR 5: fallback map, accessibility, performance docs.
