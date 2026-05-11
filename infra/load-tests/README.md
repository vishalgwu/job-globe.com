# Load Tests

k6 load tests for the Job Globe API.

Audit note as of 2026-05-11: the script exists, but no current staging or production baseline result is recorded in the repository. Do not claim load-test readiness until a run artifact is captured.

## Install k6

**macOS**
```bash
brew install k6
```

**Linux**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

**Windows / other** — see https://k6.io/docs/get-started/installation/

## Running

**Against local dev server**
```bash
k6 run infra/load-tests/jobs-api.js
```

**Against staging / production**
```bash
BASE_URL=https://your-app.vercel.app k6 run infra/load-tests/jobs-api.js
```

## Thresholds

| Metric | Threshold |
|---|---|
| `http_req_duration` p95 | < 500 ms |
| `http_req_failed` rate | < 1% |

k6 exits with a non-zero code if any threshold is breached, making it suitable for CI gating.

## Test shape

| Stage | Duration | VUs |
|---|---|---|
| Ramp-up | 30 s | 0 → 20 |
| Steady (low) | 1 min | 20 |
| Ramp-up | 30 s | 20 → 50 |
| Steady (peak) | 1 min | 50 |
| Ramp-down | 30 s | 50 → 0 |

Total duration: ~3 min 30 s.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | Target base URL |
