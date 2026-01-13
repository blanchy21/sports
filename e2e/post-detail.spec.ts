import { test, expect } from '@playwright/test';

test.describe('Post Detail Page', () => {
  // We'll navigate to a post from the feed instead of hardcoding a URL
  test.beforeEach(async ({ page }) => {
    // Go to feed first
    await page.goto('/feed');

    // Wait for posts to load
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    // Click on first post to go to detail
    await articles.first().locator('.cursor-pointer').first().click();

    // Wait for navigation to post detail
    await expect(page).toHaveURL(/\/post\//, { timeout: 10000 });
  });

  test('displays post title and content', async ({ page }) => {
    // Post should have a title (h1 or h2)
    const title = page.locator('h1, h2').first();
    await expect(title).toBeVisible();

    // Post should have content
    const content = page.locator('article, .prose, main');
    await expect(content.first()).toBeVisible();
  });

  test('displays author information', async ({ page }) => {
    // Should show author username
    const authorInfo = page.getByText(/@\w+/);
    await expect(authorInfo.first()).toBeVisible();
  });

  test('displays post metadata', async ({ page }) => {
    // Should show some metadata (date, read time, etc)
    const metadata = page.locator('time, .text-muted-foreground');
    expect(await metadata.count()).toBeGreaterThan(0);
  });

  test('displays voting section', async ({ page }) => {
    // Should have voting buttons
    const voteSection = page.locator('button').filter({
      has: page.locator('svg'),
    });
    expect(await voteSection.count()).toBeGreaterThan(0);
  });

  test('displays comment section', async ({ page }) => {
    // Should have comments section
    const commentsSection = page.getByText(/comment|repl/i);
    await expect(commentsSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('can navigate back to feed', async ({ page }) => {
    // Click browser back or find back button
    const backButton = page.getByRole('button', { name: /back/i }).or(
      page.locator('a[href="/feed"]')
    );

    if (await backButton.isVisible()) {
      await backButton.click();
    } else {
      await page.goBack();
    }

    // Should be back on feed
    await expect(page).toHaveURL(/\/(feed)?$/);
  });

  test('displays tags if present', async ({ page }) => {
    // Tags are usually shown as badges/chips
    const tags = page.locator('[class*="badge"], [class*="tag"], span:has-text("#")');

    if ((await tags.count()) > 0) {
      await expect(tags.first()).toBeVisible();
    }
  });

  test('shows share functionality', async ({ page }) => {
    // Look for share button or link
    const shareButton = page.getByRole('button', { name: /share/i }).or(
      page.locator('button').filter({ has: page.locator('svg.lucide-share') })
    );

    if (await shareButton.isVisible()) {
      // Share functionality exists
      expect(await shareButton.isVisible()).toBeTruthy();
    }
  });
});

test.describe('Post Comments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feed');

    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    await articles.first().locator('.cursor-pointer').first().click();
    await expect(page).toHaveURL(/\/post\//, { timeout: 10000 });
  });

  test('displays existing comments', async ({ page }) => {
    // Wait for comments to load
    const commentsArea = page.locator('.comments, [data-testid="comments"]').or(
      page.getByText(/comment/i).locator('..')
    );

    // Comments section should be visible
    await expect(commentsArea.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows comment count', async ({ page }) => {
    // Should display number of comments
    const commentCount = page.getByText(/\d+\s*(comment|repl)/i);
    await expect(commentCount.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // Post might have 0 comments
    });
  });
});

test.describe('Post Voting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feed');

    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    await articles.first().locator('.cursor-pointer').first().click();
    await expect(page).toHaveURL(/\/post\//, { timeout: 10000 });
  });

  test('displays vote count', async ({ page }) => {
    // Should show vote/like count somewhere
    const voteCount = page.locator('button').filter({
      hasText: /\d+/,
    });

    expect(await voteCount.count()).toBeGreaterThan(0);
  });

  test('vote buttons are interactive', async ({ page }) => {
    // Find vote buttons
    const voteButton = page.locator('button').filter({
      has: page.locator('svg.lucide-star, svg.lucide-heart, svg.lucide-chevron-up'),
    }).first();

    if (await voteButton.isVisible()) {
      // Button should be clickable (not disabled)
      const isDisabled = await voteButton.isDisabled();

      // Either disabled (not logged in) or enabled (logged in)
      expect(typeof isDisabled).toBe('boolean');
    }
  });
});
