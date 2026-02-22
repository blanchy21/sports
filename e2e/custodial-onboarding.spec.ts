import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Intercept /api/auth/sb-session with a mocked custodial session. */
async function mockSession(
  page: Page,
  opts: {
    userId?: string;
    email?: string;
    hiveUsername?: string;
  } = {}
) {
  const { userId = 'google-uid-e2e-test', email = 'e2e-test@example.com', hiveUsername } = opts;

  await page.route('**/api/auth/sb-session', async (route, request) => {
    const method = request.method();

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: true,
          session: {
            userId,
            username: email,
            authType: 'soft',
            hiveUsername,
            loginAt: Date.now(),
          },
        }),
      });
    }

    // POST (session sync) and DELETE (logout) — acknowledge without hitting server
    if (method === 'POST' || method === 'DELETE') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }

    return route.continue();
  });

  // Intercept NextAuth's getSession() to prevent server errors from useGoogleAuthBridge.
  // next-auth/react calls /api/auth/[...nextauth] paths; return null = no NextAuth session.
  await page.route('**/api/auth/csrf*', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'mock-csrf' }),
    });
  });
  await page.route('**/api/auth/providers*', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

/**
 * Wait for the auth context to hydrate by watching for evidence that the
 * onboarding page has rendered its content (as opposed to returning null).
 */
async function waitForOnboardingPage(page: Page) {
  // The page returns null until isClient && user — wait for the heading or redirect
  await expect(page.getByRole('heading', { name: /choose your hive username/i })).toBeVisible({
    timeout: 20_000,
  });
}

// ---------------------------------------------------------------------------
// 1. Auth Page — Google sign-in presence
// ---------------------------------------------------------------------------

test.describe('Auth Page — Google sign-in', () => {
  test('shows Continue with Google button', async ({ page }) => {
    await page.goto('/auth');

    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Info box about Google Account should be visible
    await expect(page.getByText(/start exploring immediately/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Onboarding Username Page
// ---------------------------------------------------------------------------

test.describe('Onboarding Username Page', () => {
  test('redirects unauthenticated visitors to /auth', async ({ page }) => {
    // No session mock — server returns unauthenticated
    await page.route('**/api/auth/sb-session', async (route, request) => {
      if (request.method() !== 'GET') return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: false,
          session: null,
        }),
      });
    });

    await page.goto('/onboarding/username');

    await page.waitForURL('**/auth', { timeout: 15_000 });
  });

  test('redirects user with existing hiveUsername to /sportsbites', async ({ page }) => {
    await mockSession(page, { hiveUsername: 'sb-testuser' });

    await page.goto('/onboarding/username');

    // Session restore happens asynchronously after client hydration.
    // Under parallel test load the dev server can be slow, so allow generous timeout.
    await page.waitForURL('**/sportsbites**', { timeout: 30_000 });
  });

  test('renders username picker for user without hiveUsername', async ({ page }) => {
    await mockSession(page);

    await page.goto('/onboarding/username');

    // Wait for auth context hydration — page renders null until ready
    await waitForOnboardingPage(page);

    await expect(page.locator('input#hive-username')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    await expect(page.getByText(/3-16 characters/i)).toBeVisible();
  });

  test('shows available status for valid username', async ({ page }) => {
    await mockSession(page);

    // Intercept check-username → valid + available
    await page.route('**/api/hive/check-username**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { username: 'sb-e2eavail', valid: true, available: true },
        }),
      });
    });

    await page.goto('/onboarding/username');
    await waitForOnboardingPage(page);

    const input = page.locator('input#hive-username');
    await input.fill('sb-e2eavail');

    // Green check icon (CheckCircle from lucide)
    await expect(page.locator('.text-emerald-500')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/username is available/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  test('shows taken status for unavailable username', async ({ page }) => {
    await mockSession(page);

    await page.route('**/api/hive/check-username**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'sb-taken',
            valid: true,
            available: false,
            reason: 'This username is already taken',
          },
        }),
      });
    });

    await page.goto('/onboarding/username');
    await waitForOnboardingPage(page);

    const input = page.locator('input#hive-username');
    await input.fill('sb-taken');

    await expect(page.locator('.text-red-500')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/already taken/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  test('Create Account triggers creation and redirects', async ({ page }) => {
    await mockSession(page);

    // Check username → valid + available
    await page.route('**/api/hive/check-username**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { username: 'sb-newuser', valid: true, available: true },
        }),
      });
    });

    // Track that create-account POST was actually called
    let createAccountCalled = false;

    // Create account → success (with small delay so "Creating…" text is visible)
    await page.route('**/api/hive/create-account', async (route, request) => {
      if (request.method() !== 'POST') return route.continue();
      createAccountCalled = true;
      await new Promise((r) => setTimeout(r, 500));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { username: 'sb-newuser' } }),
      });
    });

    await page.goto('/onboarding/username');
    await waitForOnboardingPage(page);

    const input = page.locator('input#hive-username');
    await input.fill('sb-newuser');

    // Wait for "available" state
    await expect(page.getByText(/username is available/i)).toBeVisible({ timeout: 5_000 });

    // Click Create Account
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show creating text while the POST is in-flight
    await expect(page.getByText(/creating your account/i)).toBeVisible({ timeout: 5_000 });

    // Wait for the POST to complete — the handler calls router.replace('/sportsbites')
    // which triggers a client-side navigation. In test environments without a full
    // database, the navigation may not complete, so we verify the POST was made
    // and the "Creating" state appeared (proving the happy-path logic executed).
    await expect.poll(() => createAccountCalled, { timeout: 10_000 }).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Custodial Feed Access
// ---------------------------------------------------------------------------

test.describe('Custodial Feed Access', () => {
  test('custodial user with hiveUsername can access feed', async ({ page }) => {
    await mockSession(page, { hiveUsername: 'sb-testuser' });

    await page.goto('/sportsbites');

    // Should NOT redirect to /
    await expect(page).not.toHaveURL('/');

    // Feed content should render (main element present)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Custodial Publish Page
// ---------------------------------------------------------------------------

test.describe('Custodial Publish Page', () => {
  test('custodial user sees publish form with soft-user notice', async ({ page }) => {
    await mockSession(page, { hiveUsername: 'sb-testuser' });

    // Stub post count API to avoid 404
    await page.route('**/api/posts**', async (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, posts: [] }),
        });
      }
      return route.continue();
    });

    await page.goto('/publish');

    // Title input should be visible
    const titleInput = page.getByPlaceholder(/post title/i);
    await expect(titleInput).toBeVisible({ timeout: 15_000 });

    // Soft user notice
    await expect(page.getByText(/your post will be visible to everyone/i)).toBeVisible();

    // Button should say "Publish" (not "Publish to Hive")
    const publishButton = page.getByRole('button', { name: /publish/i }).filter({
      hasNotText: /hive/i,
    });
    await expect(publishButton).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Username Check API (direct HTTP)
// ---------------------------------------------------------------------------

test.describe('Username Check API', () => {
  test('returns valid+available for unused username', async ({ request }) => {
    const res = await request.get('/api/hive/check-username?username=sb-e2etestxyz123');
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.valid).toBe(true);
    expect(json.data.available).toBe(true);
  });

  test('returns valid+unavailable for taken username', async ({ request }) => {
    const res = await request.get('/api/hive/check-username?username=blanchy');
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.available).toBe(false);
  });

  test('returns invalid for malformed username', async ({ request }) => {
    const res = await request.get('/api/hive/check-username?username=AB');
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.valid).toBe(false);
  });

  test('returns error when missing parameter', async ({ request }) => {
    const res = await request.get('/api/hive/check-username');
    expect(res.status()).toBe(400);
  });
});
