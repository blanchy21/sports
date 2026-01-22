import { test, expect } from '@playwright/test';

const hiveUsername = process.env.PLAYWRIGHT_HIVE_USERNAME;

const skipReason = 'PLAYWRIGHT_HIVE_USERNAME env var is required for the Hive login flow e2e test.';

if (hiveUsername) {
  test.describe.configure({ mode: 'serial' });
}

test.describe('Auth Login', () => {
  test('persists hive auth state and shows personalized feed', async ({ page, request }) => {
    test.skip(!hiveUsername, skipReason);

    const username = hiveUsername!;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accountSummary: any = null;
    try {
      const response = await request.get(`/api/hive/account/summary?username=${encodeURIComponent(username)}`);
      if (response.ok()) {
        const payload = await response.json();
        if (payload?.success) {
          accountSummary = payload.account;
        }
      }
    } catch (error) {
      console.warn('[e2e/auth-login] Failed to fetch account summary:', error);
    }

    const nowIso = new Date().toISOString();
    const displayName = accountSummary?.profile?.name ?? username;
    const avatar = accountSummary?.profile?.profileImage ?? `https://images.hive.blog/u/${username}/avatar`;

    const authState = {
      user: {
        id: username,
        username,
        displayName,
        avatar,
        bio: accountSummary?.profile?.about ?? null,
        isHiveAuth: true,
        hiveUsername: username,
        reputation: accountSummary?.reputation ?? accountSummary?.reputationScore ?? null,
        reputationFormatted: accountSummary?.reputationFormatted ?? null,
        hiveBalance: accountSummary?.balances?.hive ?? accountSummary?.hiveBalance ?? null,
        hbdBalance: accountSummary?.balances?.hbd ?? accountSummary?.hbdBalance ?? null,
        hivePower: accountSummary?.hivePower ?? null,
        rcPercentage: accountSummary?.rcPercentage ?? accountSummary?.resourceCredits ?? null,
        hiveProfile: accountSummary?.profile ?? null,
        hiveStats: accountSummary?.stats ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      authType: 'hive',
      hiveUser: {
        username,
        isAuthenticated: true,
        provider: 'keychain',
        sessionId: accountSummary?.sessionId ?? null,
      },
    };

    await page.goto('/auth');

    await page.evaluate(([serializedState]) => {
      localStorage.setItem('authState', serializedState);
    }, [JSON.stringify(authState)]);

    await page.goto('/feed');

    await expect(page.getByPlaceholder("What's happening in sports today?")).toBeVisible();
    await expect(page.getByText(/featured posts/i)).toBeVisible();
    await expect(page.getByText(username, { exact: false })).toBeVisible();
  });
});
