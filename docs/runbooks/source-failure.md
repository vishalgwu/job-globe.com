# Runbook: Handling a Source Connector Failure

## Symptoms

- `agent_runs` table shows `status = 'failed'` for a specific source.
- Health log reports `source_freshness.{source}.is_fresh = false`.
- No new `jobs_raw` rows from the source for > 2× its freshness interval.

---

## Diagnosis

### 1. Check recent agent_runs

```sql
SELECT source, status, started_at, finished_at,
       processed_count, failed_count, error_message
FROM agent_runs
WHERE agent_name = 'discovery'
  AND source = '<source_name>'
ORDER BY started_at DESC
LIMIT 5;
```

### 2. Check worker health log

The health module logs a structured report every 5 minutes.  Look for:

```json
{"event": "health.report", "source_freshness": {"<source>": {"status": "failed"}}}
```

### 3. Check queue depths

```bash
redis-cli xlen job-globe.discovery
redis-cli xlen job-globe.verification
```

A growing discovery stream backlog means verification is falling behind.
An empty discovery stream with a failed source means the connector itself failed.

---

## Common Causes and Fixes

| Cause | Evidence | Fix |
|---|---|---|
| API credentials expired | `error_message` contains 401/403 | Rotate key in env vars, restart workers |
| Source API is down | `error_message` contains connection error or 5xx | Wait for source recovery — automatic retry on next cycle |
| Source changed response schema | `KeyError` or `AttributeError` in error_message | Update the `_normalise()` method in the connector |
| Rate limit exceeded | `error_message` contains 429 | Increase freshness interval in scheduler.py |
| SSL certificate error | `SSLError` in error_message | Check source domain — may be a compromised endpoint |

---

## Recovery Steps

### Credential rotation

```bash
# 1. Update the env var in your deployment (Vercel, Docker, K8s secret)
# 2. Restart the workers service
docker compose restart workers

# 3. Verify the next run succeeds
watch -n 10 'psql $DATABASE_URL -c "
  SELECT status, started_at, processed_count
  FROM agent_runs
  WHERE source = '"'"'<source>'"'"'
  ORDER BY started_at DESC LIMIT 3;"'
```

### Schema change in source API

1. Fetch a live sample from the source endpoint manually.
2. Update `_normalise()` in the connector module.
3. Run tests: `pytest tests/agents/test_connectors.py -v`
4. Deploy and verify.

---

## Escalation

If a source remains failed for more than 2× its freshness interval and
the cause is not clear from the above steps:

- Check the source provider's status page or API changelog.
- Open an issue tagged `source-failure` in the repository.
- If the source contributes > 10% of active jobs, consider marking affected
  canonical jobs as `status = 'stale'` until the source recovers.
