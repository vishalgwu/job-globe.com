# ADR-005: Auth Provider

## Status

Accepted and implemented for user auth.

## Decision

Use Supabase Auth as the initial auth provider, connected to the internal `users` table through provider subject IDs.

## Context

The plan requires anonymous browsing, member personalization, admin routes, token refresh, logout, and session expiry. Supabase fits the project speed target and keeps PostgreSQL alignment.

## Current Implementation Notes

The web app uses Supabase browser/SSR clients, auth pages, and auth session helper routes. Protected API routes resolve Supabase sessions into internal `users` records. Admin routes and full RBAC enforcement are not implemented yet.

Account deletion is not currently complete: the route deletes from the wrong application table name, does not remove raw resume Storage objects, and does not anonymize or remove the internal `users` row. Treat account deletion as a P0 auth/privacy follow-up before public launch.

## Consequences

Provider secrets, callback URLs, branch protection, and staging setup must be configured outside the repository before live auth sign-off.
