import { test, expect } from '@playwright/test';

test.describe('Publish Page', () => {
  test('redirects guests back to home', async ({ page }) => {
    await page.goto('/publish');

    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/feed', {
      timeout: 10_000,
    });

    await expect(page.getByRole('heading', { name: /why sportsblock/i })).toBeVisible();
  });
});
