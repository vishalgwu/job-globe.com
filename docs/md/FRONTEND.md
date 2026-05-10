# Frontend Module

## Module Name and Purpose

Frontend: `apps/web`

The frontend is a Next.js App Router application that lets users browse jobs on an interactive globe, filter job data, inspect job details, manage account/profile data, upload resumes, save jobs, create alerts, and view application history.

## What Is Completed

- Main globe route at `apps/web/app/(globe)/page.tsx`.
- Auth pages for login, register, and onboarding.
- Profile pages for profile, saved jobs, alerts, and applications.
- Globe experience with filters, zoom layers, fallback map/list behavior, and job selection.
- Job panel, match breakdown, apply CTA, and quick prep widgets.
- Zustand stores for globe, job, and user state.
- Vitest tests for scorer, profile validation, auth guards, and API smoke coverage.

## What Is In Progress

- Launch accessibility and browser/device QA.
- UI polish for production sign-off.
- Aligning old demo-mode onboarding copy with authenticated profile API behavior.

## What Is Remaining

- Record Lighthouse and browser/device results.
- Record keyboard and screen reader QA.
- Improve any post-QA usability/accessibility findings.

## How It Works

The browser loads the Next.js app from `apps/web`. `GlobeExperience` fetches aggregate and list data from `/api/jobs` in several modes. Users can filter by role, location, remote type, job type, and search text. Selecting a job opens the job panel and fetches detail data.

Authentication is handled by Supabase. Client components call API routes; protected pages first check `/api/auth/session`. Saved jobs use API sync when authenticated and browser storage for anonymous sessions.

## Key Files

- `apps/web/app/(globe)/page.tsx`
- `apps/web/components/globe/GlobeExperience/GlobeExperience.tsx`
- `apps/web/components/globe/GlobeCanvas/GlobeCanvas.tsx`
- `apps/web/components/globe/FallbackMap/FallbackMap.tsx`
- `apps/web/components/filters/FilterBar/FilterBar.tsx`
- `apps/web/components/job-panel/*`
- `apps/web/components/onboarding/*`
- `apps/web/app/(auth)/*`
- `apps/web/app/(profile)/*`
- `apps/web/stores/*`
- `apps/web/__tests__/*`

## Dependencies and Integrations

- Next.js, React, TypeScript
- Zustand for state
- Supabase browser/SSR clients
- Three/globe-related packages are installed, while the current globe UI is implemented in React/CSS components
- Vitest and jsdom for tests
