import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp up to 20 VUs
    { duration: '1m',  target: 20 },  // hold at 20
    { duration: '30s', target: 50 },  // ramp to 50
    { duration: '1m',  target: 50 },  // hold at 50
    { duration: '30s', target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95th percentile under 500 ms
    http_req_failed:   ['rate<0.01'], // error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Reflect actual /api/jobs query-string contract:
//   mode=global|country|city|jobs|detail
//   country=<ISO2>  (not countryCode, not country_code)
//   remote=remote|hybrid|on-site
//   category=<slug>
//   postedWithin=1hr|6hr|1day|7day|past-month|any-time
const SCENARIOS = [
  '?mode=global',
  '?mode=country&country=US',
  '?mode=country&country=GB',
  '?mode=country&country=DE',
  '?mode=city&country=US',
  '?mode=jobs&category=software-engineering',
  '?mode=jobs&category=machine-learning',
  '?mode=jobs&remote=remote',
  '?mode=jobs&remote=hybrid',
  '?mode=jobs&postedWithin=7day',
  '?mode=jobs&postedWithin=1day',
];

export default function () {
  const qs = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const url = `${BASE_URL}/api/jobs${qs}`;

  const res = http.get(url, {
    headers: { Accept: 'application/json' },
    tags: { name: 'jobs-api' },
  });

  // The API returns { mode, source, jobs|countries|cities|... } — never a 'data' key.
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has mode key': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && typeof body === 'object' && typeof body.mode === 'string';
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
