# Load Tests

Updated: 2026-05-12

This folder contains the k6 script for the jobs API. No staging or production baseline artifact is currently stored in the repository, so the project should not claim load-test readiness yet.

## Script

`jobs-api.js` exercises `/api/jobs` with:

- `mode=global`
- `mode=country`
- `mode=city`
- `mode=jobs`
- role/category filters
- remote filters
- freshness filters

It checks for HTTP 200, a JSON `mode` key, and response time under 500 ms for each sampled request.

## Run Locally

```bash
k6 run infra/load-tests/jobs-api.js
```

## Run Against A Deployed URL

PowerShell:

```powershell
$env:BASE_URL="https://your-app.example.com"
k6 run infra/load-tests/jobs-api.js
```

Bash:

```bash
BASE_URL=https://your-app.example.com k6 run infra/load-tests/jobs-api.js
```

Equivalent k6 flag form:

```bash
k6 run --env BASE_URL=https://your-app.example.com infra/load-tests/jobs-api.js
```

## Thresholds

| Metric                  | Threshold  |
| ----------------------- | ---------- |
| `http_req_duration` p95 | `< 500 ms` |
| `http_req_failed` rate  | `< 1%`     |

The script exits non-zero if thresholds fail.

## Test Shape

| Stage       | Duration | VUs      |
| ----------- | -------- | -------- |
| Ramp-up     | 30 s     | 0 to 20  |
| Steady low  | 1 min    | 20       |
| Ramp-up     | 30 s     | 20 to 50 |
| Steady peak | 1 min    | 50       |
| Ramp-down   | 30 s     | 50 to 0  |

## Baseline To Record

When the first staging run is completed, record:

- Date and commit SHA.
- Target URL.
- Environment data source: demo, staging connector data, or production-like data.
- p95 latency.
- Error rate.
- Any failed checks.
- Whether the run happened before or after a fresh deploy.
