# Load Testing Guide

This document provides guidance for load testing the Sportsblock application.

## Overview

Load testing is essential to understand the application's performance characteristics and identify bottlenecks before they affect production users.

## Tools

### Recommended: k6

[k6](https://k6.io/) is a modern load testing tool that's well-suited for API testing.

**Installation:**
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

### Alternative: Artillery

[Artillery](https://artillery.io/) is another excellent option, especially for Node.js developers.

```bash
npm install -g artillery
```

## Test Scripts

### k6 Basic Load Test

Create `load-tests/basic.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test posts endpoint
  const postsRes = http.get(`${BASE_URL}/api/hive/posts?community=hive-115814&limit=10`);
  check(postsRes, {
    'posts status is 200': (r) => r.status === 200,
    'posts response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  sleep(2);
}
```

**Run the test:**
```bash
# Local development
k6 run load-tests/basic.js

# Against staging
k6 run -e BASE_URL=https://staging.sportsblock.app load-tests/basic.js
```

### k6 API Stress Test

Create `load-tests/stress.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const endpoints = [
    '/api/health',
    '/api/hive/posts?community=hive-115814&limit=5',
    '/api/crypto/prices',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(Math.random() * 2 + 1); // 1-3 second delay
}
```

### Artillery Configuration

Create `load-tests/artillery.yml`:

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Peak load"
  defaults:
    headers:
      User-Agent: "Artillery Load Test"

scenarios:
  - name: "Browse feed"
    weight: 70
    flow:
      - get:
          url: "/api/health"
      - think: 1
      - get:
          url: "/api/hive/posts?community=hive-115814&limit=10"
      - think: 2

  - name: "Check prices"
    weight: 30
    flow:
      - get:
          url: "/api/crypto/prices"
      - think: 3
```

**Run Artillery:**
```bash
artillery run load-tests/artillery.yml
```

## Expected Performance Limits

### Vercel Hobby Plan
- **Concurrent Executions**: 10
- **Function Duration**: 10 seconds
- **Edge Function Size**: 1MB

### Vercel Pro Plan
- **Concurrent Executions**: 100
- **Function Duration**: 60 seconds
- **Edge Function Size**: 4MB

### Application Rate Limits

| Operation | Development | Production |
|-----------|-------------|------------|
| Read (per IP/min) | 500 | 200 |
| Write (per IP/min) | 50 | 30 |
| Auth (per IP/min) | 20 | 20 |
| Realtime (per IP/min) | 100 | 60 |

### Hive API Considerations

The Hive blockchain API nodes have their own rate limits:
- Public nodes may rate limit aggressive users
- Consider using multiple nodes for failover
- Some operations (like `get_accounts`) are more expensive

**Current configured nodes:**
1. `api.hive.blog` (primary)
2. `api.openhive.network`
3. `api.deathwing.me`
4. `api.c0ff33a.uk`
5. `hive-api.arcange.eu` (fallback)

## Performance Benchmarks

### Target Response Times

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| `/api/health` | <100ms | <300ms | <500ms |
| `/api/hive/posts` | <500ms | <2000ms | <3000ms |
| `/api/crypto/prices` | <200ms | <500ms | <1000ms |
| `/api/hive/account/summary` | <300ms | <1000ms | <2000ms |

### Caching Impact

With Redis caching enabled:
- Cache hit: ~10-50ms response time
- Cache miss: Normal API response time
- Cache TTL: 5 minutes default

## Running Load Tests

### Pre-Test Checklist

- [ ] Notify team about planned load test
- [ ] Ensure test environment is isolated (don't test production!)
- [ ] Verify monitoring is active (Sentry, Vercel Analytics)
- [ ] Set up alerts for anomalies
- [ ] Have rollback plan ready

### During Test

1. Monitor Vercel dashboard for function invocations
2. Watch Sentry for error spikes
3. Check Redis metrics (if using Upstash dashboard)
4. Monitor Hive node health via `/api/monitoring?action=stats`

### Post-Test Analysis

1. Review k6/Artillery reports
2. Check Vercel function logs for errors
3. Analyze P95/P99 latencies
4. Identify bottlenecks
5. Document findings

## Common Bottlenecks

### 1. Cold Starts
- **Symptom**: First request to function is slow
- **Solution**: Use Vercel's [Instant Cron](https://vercel.com/docs/cron-jobs) to keep functions warm

### 2. Hive Node Latency
- **Symptom**: High P95 latencies on Hive endpoints
- **Solution**: Implement caching, use multiple nodes with failover

### 3. Memory Cache Eviction
- **Symptom**: Cache hit rate drops under load
- **Solution**: Increase cache size or add Redis layer

### 4. Rate Limiting
- **Symptom**: 429 responses during load test
- **Solution**: This is expected! Verify limits are appropriate for real traffic patterns

## Scaling Recommendations

### For Higher Traffic

1. **Enable Redis Caching**
   - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Reduces Hive API calls significantly

2. **Upgrade Vercel Plan**
   - Pro plan offers 100 concurrent executions
   - Enterprise for unlimited

3. **Optimize Hot Paths**
   - Profile most-used endpoints
   - Add more aggressive caching for read-heavy operations

4. **Consider Edge Functions**
   - Move simple operations to edge for lower latency
   - Good for: health checks, cached responses

## Sample Test Commands

```bash
# Quick smoke test (10 users, 30 seconds)
k6 run --vus 10 --duration 30s load-tests/basic.js

# Sustained load test
k6 run load-tests/basic.js

# Stress test (find breaking point)
k6 run load-tests/stress.js

# With custom base URL
k6 run -e BASE_URL=https://sportsblock.app load-tests/basic.js

# Generate HTML report
k6 run --out json=results.json load-tests/basic.js
# Then use k6-reporter to generate HTML
```

## CI/CD Integration

Add to GitHub Actions for automated performance regression testing:

```yaml
- name: Run Load Tests
  run: |
    k6 run --out json=results.json load-tests/basic.js
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}

- name: Check thresholds
  run: |
    # Fail if thresholds not met
    grep -q '"thresholds":{"http_req_duration":{"ok":true}' results.json
```
