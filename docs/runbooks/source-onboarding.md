# Runbook: Onboarding a New Job Source

## Purpose

Add a new external job source (ATS, job board, or government portal) to the
discovery pipeline so it is fetched automatically on a freshness schedule.

---

## Pre-requisites

- Access to the source's API documentation.
- Any credentials (API keys, board tokens, company slugs) added to the
  relevant environment variable (see `.env.example`).
- Python 3.11+ and the workers package installed (`pip install -e .` in
  `apps/workers`).

---

## Steps

### 1. Create the connector module

Copy the closest existing connector as a template:

```
cp apps/workers/src/job_globe_workers/agents/discovery/connectors/lever.py \
   apps/workers/src/job_globe_workers/agents/discovery/connectors/mynewsource.py
```

Implement the three required elements:

| Element | Description |
|---|---|
| `name` | Unique snake_case source name matching `jobs_raw.source` |
| `is_configured()` | Return True when credentials/config are present in settings |
| `fetch()` | Generator that yields raw job dicts with required keys |

**Required keys in each yielded dict:**

```python
{
    "source_job_id":   str,   # unique ID from source
    "source_url":      str,   # link to the posting on the source site
    "apply_url":       str,   # direct apply link (used as canonical dedup key)
    "title":           str,
    "company_name":    str,
    "location_raw":    str,   # free-text, e.g. "London, UK"
    "description":     str,   # plain text, max 5000 chars
    "employment_type": str,   # "full-time" | "part-time" | "contract"
    "required_skills": list,  # can be empty []
    "metadata":        dict,  # source-specific extras
}
```

### 2. Add the freshness rule

In `apps/workers/src/job_globe_workers/agents/discovery/scheduler.py`,
add a `SourceFreshnessRule` entry:

```python
SourceFreshnessRule("mynewsource", timedelta(hours=1)),
# If the source supports webhooks:
SourceFreshnessRule("mynewsource", timedelta(minutes=15), supports_webhook=True),
```

### 3. Register the connector in the runner

In `apps/workers/src/job_globe_workers/agents/discovery/runner.py`,
add an import and a line to `_CONNECTOR_REGISTRY`:

```python
from job_globe_workers.agents.discovery.connectors.mynewsource import MyNewSourceConnector

_CONNECTOR_REGISTRY: dict[str, type[AbstractConnector]] = {
    ...
    "mynewsource": MyNewSourceConnector,
}
```

### 4. Add settings fields

If the source requires credentials, add them to `settings.py`:

```python
mynewsource_api_key: str = Field(default="", alias="MYNEWSOURCE_API_KEY")
```

And to `.env.example`:

```
MYNEWSOURCE_API_KEY=replace-with-key
```

### 5. Write tests

Add a test class in `apps/workers/tests/agents/test_connectors.py`
covering at minimum:
- `_normalise()` output shape and required keys
- `is_configured()` returns False with default settings

### 6. Verify locally

```bash
cd apps/workers
pip install -e ".[dev]"
python -c "
from job_globe_workers.agents.discovery.connectors.mynewsource import MyNewSourceConnector
c = MyNewSourceConnector()
print('configured:', c.is_configured())
# With credentials set:
# for job in c.fetch(): print(job['title'], job['apply_url']); break
"
```

### 7. Smoke-test in Docker

```bash
npm run dev           # from repo root — starts full Docker stack
docker compose exec workers python -c "
from job_globe_workers.agents.discovery.runner import run_discovery_once
import threading
run_discovery_once(threading.Event())
"
# Then check jobs_raw count:
docker compose exec postgres psql -U job_globe -d job_globe \
  -c "SELECT source, COUNT(*) FROM jobs_raw GROUP BY source;"
```

---

## Rollback

To disable a source without deleting code:
1. Remove (or leave empty) its credential env vars.
2. Its `is_configured()` will return False and the runner will skip it.

To permanently remove a source:
1. Delete the connector module.
2. Remove it from `_CONNECTOR_REGISTRY` and `DEFAULT_FRESHNESS_RULES`.
3. Existing `jobs_raw` rows for that source are retained for audit purposes.
