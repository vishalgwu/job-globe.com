# API Client Notes

Purpose: reserved location for typed frontend wrappers around backend API routes.

Current status: most web components call `fetch()` directly. Shared API response types live in `packages/shared-types/typescript`, and API route behavior is documented in `docs/md/API.md`.

Use this folder when repeated client-side API calls need reusable wrappers.
