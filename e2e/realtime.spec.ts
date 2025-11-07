import { test, expect } from '@playwright/test';

test.describe('Realtime API', () => {
  test('reports monitor status', async ({ request }) => {
    const response = await request.get('/api/hive/realtime');

    expect([200, 502]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('status');
  });

  test('attempts to start and stop monitoring', async ({ request }) => {
    const start = await request.post('/api/hive/realtime');
    expect([200, 502]).toContain(start.status());
    const startJson = await start.json();
    expect(startJson).toHaveProperty('success');

    const stop = await request.delete('/api/hive/realtime');
    expect([200, 502]).toContain(stop.status());
    const stopJson = await stop.json();
    expect(stopJson).toHaveProperty('success');
  });
});
