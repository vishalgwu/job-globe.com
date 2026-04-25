# Secrets Management

All secrets are loaded from environment variables or a managed secret store. Secrets must never be committed to the repository.

Required groups: Supabase auth secrets, database URLs, Redis URLs, OpenAI API key, object storage credentials, and transactional email credentials.

Local development uses `.env.local`, copied from `.env.example`. Staging and production values must be injected by GitHub Actions environment secrets or the hosting platform.
