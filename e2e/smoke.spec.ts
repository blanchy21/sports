import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('lands on marketing hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /why sportsblock/i })).toBeVisible();
  });

  test('renders sign in action for guests', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
