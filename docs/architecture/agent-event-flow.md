# Agent Event Flow

Redis Streams are the Step 1 event bus boundary.

1. Discovery agents publish raw source fetch results.
2. Verification consumes raw job events and confirms live URLs.
3. Company identity resolves domains, logos, and trust signals.
4. Geo mapping resolves city/country hierarchy and coordinates.
5. Categorization attaches function, level, and remote taxonomy.
6. Duplicate detection merges repeated postings into canonical jobs.
7. Ranking and alerting consume canonical job updates.
