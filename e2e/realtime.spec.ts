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


const TEST_AUTH_STATE = {
  user: {
    id: 'testuser',
    username: 'testuser',
    displayName: 'Test User',
  },
  authType: 'hive',
  hiveUser: {
    username: 'testuser',
    isAuthenticated: true,
  },
};

test.describe('Realtime UI', () => {
  test('starts, emits, and clears realtime events', async ({ page, context }) => {
    await context.addInitScript(({ authState }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('authState', JSON.stringify(authState));
      (window as typeof window & { __TEST_DISABLE_WORKERBEE__?: boolean }).__TEST_DISABLE_WORKERBEE__ = true;
    }, { authState: TEST_AUTH_STATE });

    await page.goto('/monitoring');

    await expect(page.getByTestId('realtime-feed')).toBeVisible();

    await page.getByTestId('realtime-start').click();

    await page.evaluate(() => {
      const globalWindow = window as typeof window & {
        __EMIT_REALTIME_EVENT__?: (event: unknown) => void;
      };
      const emit = globalWindow.__EMIT_REALTIME_EVENT__;
      if (emit) {
        emit({
          type: 'new_post',
          data: {
            author: 'alice',
            permlink: 'hello-world',
            title: 'Hello World',
            body: 'This is a test post',
            created: new Date().toISOString(),
          },
        });
        emit({
          type: 'new_vote',
          data: {
            voter: 'bob',
            author: 'alice',
            permlink: 'hello-world',
            weight: 100,
            timestamp: new Date().toISOString(),
          },
        });
      }
    });

    await expect(page.getByTestId('realtime-event')).toHaveCount(2);

    await page.getByTestId('realtime-clear').click();
    await expect(page.getByTestId('realtime-event')).toHaveCount(0);

    await page.getByTestId('realtime-stop').click();
  });

  test('displays notification dropdown with stored notifications', async ({ page, context }) => {
    await context.addInitScript(({ authState, notificationsKey, notifications }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('authState', JSON.stringify(authState));
      window.localStorage.setItem(notificationsKey, JSON.stringify(notifications));
      (window as typeof window & { __TEST_DISABLE_WORKERBEE__?: boolean }).__TEST_DISABLE_WORKERBEE__ = true;
    }, {
      authState: TEST_AUTH_STATE,
      notificationsKey: 'sportsblock-notifications:testuser',
      notifications: [
        {
          id: 'notif-1',
          type: 'comment',
          title: 'New Comment',
          message: '@bob replied to your post',
          read: false,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          type: 'vote',
          title: 'New Vote',
          message: '@carol upvoted your post',
          read: true,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await page.goto('/dashboard');

    const notificationTrigger = page.getByRole('button', { name: /notifications/i });
    await notificationTrigger.click();

    const dropdown = page.getByTestId('notification-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText(/New Comment/i)).toBeVisible();

    await dropdown.getByText(/Clear/i).click();
    await expect(dropdown.getByText(/No notifications yet/i)).toBeVisible();
  });
});
