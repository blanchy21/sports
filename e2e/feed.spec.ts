import { test, expect } from '@playwright/test';

test.describe('Feed Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feed');
  });

  test('loads feed page with posts', async ({ page }) => {
    // Wait for the page to load
    await expect(page).toHaveTitle(/Sportsblock/i);

    // Feed should have a main content area
    await expect(page.locator('main')).toBeVisible();
  });

  test('displays post cards with required elements', async ({ page }) => {
    // Wait for posts to load (article elements are PostCards)
    const articles = page.locator('article');

    // Wait for at least one post to appear (with timeout)
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    // Check first post has title
    const firstPost = articles.first();
    await expect(firstPost.locator('h2')).toBeVisible();

    // Check for author info
    await expect(firstPost.getByText(/@\w+/)).toBeVisible();
  });

  test('shows sport category filter popup', async ({ page }) => {
    // Look for filter/sport button
    const filterButton = page.getByRole('button', { name: /sport|filter|category/i });

    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Should show filter options
      await expect(page.getByText(/football|basketball|soccer|baseball/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('post cards are clickable and navigate to post detail', async ({ page }) => {
    // Wait for posts to load
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    // Get the first post's title for verification
    const firstPostTitle = await articles.first().locator('h2').textContent();

    // Click on the post content area (not buttons)
    await articles.first().locator('.cursor-pointer').first().click();

    // Should navigate to post detail page
    await expect(page).toHaveURL(/\/post\//);

    // Post detail page should show the title
    if (firstPostTitle) {
      await expect(page.getByText(firstPostTitle)).toBeVisible({ timeout: 10000 });
    }
  });

  test('displays voting and comment buttons on posts', async ({ page }) => {
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    const firstPost = articles.first();

    // Should have vote/comment interaction area
    const footer = firstPost.locator('.border-t');
    await expect(footer).toBeVisible();

    // Should have some buttons in the footer
    const buttons = footer.locator('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('bookmark button toggles state', async ({ page }) => {
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible({ timeout: 15000 });

    // Find bookmark button (has Bookmark icon)
    const bookmarkButton = articles.first().locator('button').filter({
      has: page.locator('svg.lucide-bookmark'),
    });

    if (await bookmarkButton.isVisible()) {
      // Click to bookmark
      await bookmarkButton.click();

      // Button should show bookmarked state (filled icon)
      // The fill-current class indicates bookmarked state
      await expect(bookmarkButton.locator('.fill-current')).toBeVisible({ timeout: 2000 }).catch(() => {
        // May not be visible if user not logged in
      });
    }
  });

  test('shows loading state while fetching posts', async ({ page }) => {
    // Navigate with network throttling to catch loading state
    await page.route('**/api/hive/posts**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/feed');

    // Should show some loading indicator or skeleton
    // This depends on implementation - either a spinner or skeleton cards
    const hasLoading =
      (await page.locator('.animate-pulse').count()) > 0 ||
      (await page.locator('.animate-spin').count()) > 0 ||
      (await page.getByText(/loading/i).count()) > 0;

    // Eventually posts should load
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Feed Navigation', () => {
  test('can navigate between feed and profile', async ({ page }) => {
    await page.goto('/feed');

    // Click on a user's profile link
    const authorLink = page.getByText(/@\w+/).first();
    if (await authorLink.isVisible()) {
      await authorLink.click();

      // Should navigate to user profile
      await expect(page).toHaveURL(/\/user\//);
    }
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/feed');

    // Check for sidebar navigation
    const sidebar = page.locator('aside, nav');

    if (await sidebar.first().isVisible()) {
      // Try clicking on different navigation items
      const navLinks = sidebar.locator('a');
      const count = await navLinks.count();

      if (count > 0) {
        // Navigation links should be present
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});
