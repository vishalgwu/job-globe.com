# Load Tests

This folder contains the existing k6 script for the jobs API. No staging or production baseline artifact is currently stored in the repository, so the project should not claim load-test readiness yet.

## Run Locally

```bash
k6 run infra/load-tests/jobs-api.js
```

## Run Against A Deployed URL

```bash
BASE_URL=https://your-app.example.com k6 run infra/load-tests/jobs-api.js
```

## Thresholds

| Metric | Threshold |
|---|---|
| `http_req_duration` p95 | `< 500 ms` |
| `http_req_failed` rate | `< 1%` |

The script exits non-zero if thresholds fail, which makes it suitable for CI once a real baseline target exists.

## Test Shape

| Stage | Duration | VUs |
|---|---|---|
| Ramp-up | 30 s | 0 to 20 |
| Steady low | 1 min | 20 |
| Ramp-up | 30 s | 20 to 50 |
| Steady peak | 1 min | 50 |
| Ramp-down | 30 s | 50 to 0 |
