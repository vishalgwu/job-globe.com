# Secrets Management

All secrets are loaded from environment variables or a managed secret store. Secrets must never be committed to the repository.

Required groups: Supabase auth secrets, database URLs, Redis URLs, OpenAI API key, object storage credentials, and transactional email credentials.

Local Docker development uses root `.env`, copied from `.env.example`. Staging and production values must be injected by GitHub Actions environment secrets or the hosting platform.

For direct Next.js development outside Docker, either run commands with the same environment variables loaded in the shell or create an app-local `apps/web/.env.local` from the safe template and fill in local values.
