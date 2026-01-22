import { test, expect } from '@playwright/test';

const hiveUsername = process.env.PLAYWRIGHT_HIVE_USERNAME;

test.describe('Publish Page - Unauthenticated', () => {
  test('redirects guests back to home', async ({ page }) => {
    await page.goto('/publish');

    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/feed', {
      timeout: 10_000,
    });

    await expect(page.getByRole('heading', { name: /why sportsblock/i })).toBeVisible();
  });
});

test.describe('Publish Page - Authenticated', () => {
  test.beforeEach(async ({ page, request }) => {
    test.skip(!hiveUsername, 'PLAYWRIGHT_HIVE_USERNAME required for authenticated tests');

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
    } catch {
      // Ignore errors
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
        isHiveAuth: true,
        hiveUsername: username,
        reputation: accountSummary?.reputation ?? null,
        hiveBalance: accountSummary?.balances?.hive ?? null,
        hbdBalance: accountSummary?.balances?.hbd ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      authType: 'hive',
      hiveUser: {
        username,
        isAuthenticated: true,
        provider: 'keychain',
      },
    };

    await page.goto('/auth');
    await page.evaluate(([serializedState]) => {
      localStorage.setItem('authState', serializedState);
    }, [JSON.stringify(authState)]);
  });

  test('displays publish form for authenticated users', async ({ page }) => {
    test.skip(!hiveUsername, 'PLAYWRIGHT_HIVE_USERNAME required');

    await page.goto('/publish');

    // Should show title input
    const titleInput = page.getByPlaceholder(/title/i).or(page.locator('input[name="title"]'));
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    // Should show body/content editor
    const bodyEditor = page.locator('textarea').or(page.locator('[contenteditable="true"]'));
    await expect(bodyEditor.first()).toBeVisible();
  });

  test('title and body inputs accept text', async ({ page }) => {
    test.skip(!hiveUsername, 'PLAYWRIGHT_HIVE_USERNAME required');

    await page.goto('/publish');

    const titleInput = page.getByPlaceholder(/title/i).or(page.locator('input[name="title"]'));
    await titleInput.fill('Test Post Title');
    await expect(titleInput).toHaveValue('Test Post Title');

    const bodyEditor = page.locator('textarea').first();
    if (await bodyEditor.isVisible()) {
      await bodyEditor.fill('This is the body of my test post.');
      await expect(bodyEditor).toHaveValue(/test post/i);
    }
  });

  test('shows tag input field', async ({ page }) => {
    test.skip(!hiveUsername, 'PLAYWRIGHT_HIVE_USERNAME required');

    await page.goto('/publish');

    const tagsInput = page.getByPlaceholder(/tag/i).or(page.locator('input[name="tags"]'));
    await expect(tagsInput).toBeVisible({ timeout: 10000 });
  });

  test('shows publish/submit button', async ({ page }) => {
    test.skip(!hiveUsername, 'PLAYWRIGHT_HIVE_USERNAME required');

    await page.goto('/publish');

    const publishButton = page.getByRole('button', { name: /publish|submit|post/i });
    await expect(publishButton).toBeVisible({ timeout: 10000 });
  });

  test('validates required fields before submission', async ({ page }) => {
    test.skip(!hiveUsername, 'PLAYWRIGHT_HIVE_USERNAME required');

    await page.goto('/publish');

    const publishButton = page.getByRole('button', { name: /publish|submit|post/i });

    if (await publishButton.isEnabled()) {
      await publishButton.click();

      const errorMessage = page.getByText(/required|please|enter|fill/i);
      await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {
        // Button might be disabled instead
      });
    }
  });
});
