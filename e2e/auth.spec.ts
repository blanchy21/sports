import { test, expect } from '@playwright/test';

test.describe('Auth Page', () => {
  test('toggles between login and signup modes', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByRole('button', { name: 'Sign up' }).click();

    // Wait for mode transition (webkit needs explicit wait for heading to update)
    await expect(page.getByRole('heading', { name: /welcome back/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /join sportsblock/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('shows validation message when email login submitted empty', async ({ page }) => {
    await page.goto('/auth');

    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter both email and password')).toBeVisible();
  });
});
