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

const FILTERS = [
  '?mode=global',
  '?mode=country&country=US',
  '?mode=country&country=GB',
  '?mode=country&country=DE',
  '?mode=jobs&category=Engineering',
  '?mode=jobs&category=Design',
  '?mode=jobs&remote_type=remote',
  '?mode=jobs&remote_type=hybrid',
  '?mode=jobs&posted_window=7d',
  '?mode=jobs&posted_window=24h',
  '?mode=city&country=US',
];

export default function () {
  const filter = FILTERS[Math.floor(Math.random() * FILTERS.length)];
  const url = `${BASE_URL}/api/jobs${filter}`;

  const res = http.get(url, {
    headers: {
      Accept: 'application/json',
    },
    tags: { name: 'jobs-api' },
  });

  check(res, {
    'status is 200':        (r) => r.status === 200,
    'response has data key': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && typeof body === 'object' && 'data' in body;
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
