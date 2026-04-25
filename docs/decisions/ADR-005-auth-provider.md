# ADR-005: Auth Provider

## Status
Accepted for Step 1

## Decision
Use Supabase Auth as the initial auth provider, connected to the internal `users` table through provider subject IDs.

## Context
The plan requires anonymous browsing, member personalization, admin routes, token refresh, logout, and session expiry. Supabase fits the project speed target and keeps PostgreSQL alignment.

## Consequences
The web shell exposes auth API route boundaries and environment variables. Provider secrets, callback URLs, branch protection, and staging setup must be configured outside the repository before live auth sign-off.
