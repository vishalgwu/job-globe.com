# Runbook: Replaying Ingestion Safely

## When to replay

- A connector bug caused malformed or missing data for a time window.
- A migration added new fields and you want existing raw jobs re-processed.
- The verification or canonicalization workers had a bug and produced
  incorrect `jobs_canonical` rows that need to be recomputed.

---

## Concepts

The pipeline has three idempotent write operations that make replay safe:

| Table | Idempotency key | On conflict |
|---|---|---|
| `jobs_raw` | `(source, source_job_id)` | UPDATE (overwrites payload, fetched_at) |
| `jobs_canonical` | `apply_url` | UPDATE (refreshes title, description, last_seen_at) |
| `job_taxonomy_links` | `(job_id, taxonomy_id)` | UPDATE confidence |

Re-running ingestion for the same source jobs is always safe.

---

## Option A: Force-refetch from source

The simplest replay is to delete the `agent_runs` rows for a source so the
scheduler treats it as never having run:

```sql
-- Preview what will be deleted
SELECT id, source, started_at, status
FROM agent_runs
WHERE agent_name = 'discovery' AND source = '<source_name>';

-- Delete (forces re-fetch on next discovery cycle)
DELETE FROM agent_runs
WHERE agent_name = 'discovery' AND source = '<source_name>';
```

The next discovery run will treat the source as due immediately and fetch
a fresh batch.  No restart required.

---

## Option B: Replay from existing jobs_raw

If the source data is already in `jobs_raw` but downstream processing
(verification, canonicalization) failed, you can re-publish raw events to
the discovery stream:

```bash
cd apps/workers

python - <<'EOF'
import json
from job_globe_workers.db.connection import get_pool
from job_globe_workers.event_bus.producer import publish_event
from job_globe_workers.settings import settings

pool = get_pool()
with pool.connection() as conn:
    rows = conn.execute(
        """
        SELECT source, source_job_id, source_url, payload
        FROM jobs_raw
        WHERE source = %s
          AND fetched_at >= %s
        """,
        ("<source_name>", "<start_datetime>"),
    ).fetchall()

count = 0
for source, source_job_id, source_url, payload in rows:
    event = {
        "source": source,
        "source_job_id": source_job_id,
        "source_url": source_url,
        **{k: (json.dumps(v) if isinstance(v, (dict, list)) else str(v))
           for k, v in (payload or {}).items()},
    }
    publish_event(settings.discovery_stream, event)
    count += 1

print(f"Re-published {count} events to {settings.discovery_stream}")
EOF
```

---

## Option C: Recompute canonical jobs from jobs_raw

If `jobs_canonical` rows need to be fully recomputed (e.g., after a schema
migration), mark them for reprocessing:

```sql
-- Mark all canonical jobs from a source as needing refresh
-- (they will be upserted with updated data on next ingestion)
UPDATE jobs_canonical jc
SET last_seen_at = '2000-01-01'::timestamptz   -- forces them to appear stale
FROM jobs_raw jr
WHERE jr.id = jc.raw_job_id
  AND jr.source = '<source_name>';
```

Then run Option A or B to trigger a fresh ingestion cycle.

---

## Monitoring replay progress

```sql
-- Watch raw job count for the source
SELECT source, COUNT(*), MAX(fetched_at) as latest
FROM jobs_raw
WHERE source = '<source_name>'
GROUP BY source;

-- Watch canonical job count
SELECT COUNT(*) as active_jobs, MAX(last_seen_at) as latest_seen
FROM jobs_canonical
WHERE status = 'active';

-- Watch agent_runs for the current run
SELECT status, processed_count, failed_count, error_message
FROM agent_runs
WHERE agent_name = 'discovery' AND source = '<source_name>'
ORDER BY started_at DESC LIMIT 3;
```

---

## Safety checklist before replay

- [ ] Confirm the connector bug is fixed and tests pass.
- [ ] Confirm the downstream workers are running and healthy.
- [ ] If replaying a large source (> 10k jobs), schedule outside peak traffic hours.
- [ ] After replay, verify `/api/health` still returns OK.
- [ ] After replay, verify `/api/jobs?mode=global` returns expected country counts.
