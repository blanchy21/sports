import { test, expect } from '@playwright/test';

const DEFAULT_HIVE_USERNAME = process.env.PLAYWRIGHT_HIVE_USERNAME || 'blanchy';
const PROVIDERS = ['keychain', 'hiveauth', 'hivesigner'] as const;

type WalletProvider = typeof PROVIDERS[number];

const providerLabelMap: Record<WalletProvider, RegExp> = {
  keychain: /Hive Keychain/i,
  hiveauth: /HiveAuth/i,
  hivesigner: /HiveSigner/i,
};

const requiresUsername = (provider: WalletProvider) => provider === 'keychain' || provider === 'hiveauth';

async function expectFeedForUser(page: import('@playwright/test').Page, username: string) {
  await page.waitForURL('**/feed');
  await expect(page.getByPlaceholder(/What\'s happening in sports today\?/i)).toBeVisible();
  await expect(page.getByText(/Featured Posts/i)).toBeVisible();
  const authState = await page.evaluate(() => {
    const raw = window.localStorage.getItem('authState');
    return raw ? JSON.parse(raw) : null;
  });
  expect(authState).not.toBeNull();
  expect(authState.authType).toBe('hive');
  expect(authState.user?.username).toBe(username);
}

test.describe('Aioha Wallet Providers', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ username, providers }) => {
      window.localStorage?.clear();
      window.sessionStorage?.clear();

      (window as any).__AIOHA_FORCE_STUB__ = true;

      const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

      const stub: Record<string, unknown> = {
        getProviders: () => providers,
        getCurrentUser: () => (stub.__currentUser ?? null),
        getCurrentProvider: () => (stub.__currentProvider ?? null),
        getOtherLogins: () => [],
        isLoggedIn: () => Boolean(stub.__currentUser),
        async login(provider: string, suppliedUsername?: string) {
          const finalUsername = suppliedUsername && suppliedUsername.trim().length > 0 ? suppliedUsername : username;
          (window as any).__AIOHA_TEST_LAST_LOGIN__ = { provider, username: finalUsername };
          stub.__currentUser = { username: finalUsername };
          stub.__currentProvider = provider;
          return {
            success: true,
            provider,
            username: finalUsername,
            user: { username: finalUsername },
            account: { name: finalUsername },
          };
        },
        on(event: string, handler: (...args: unknown[]) => void) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(handler);
        },
        off(event: string, handler: (...args: unknown[]) => void) {
          const set = listeners.get(event);
          if (!set) return;
          set.delete(handler);
          if (set.size === 0) listeners.delete(event);
        },
        async logout() {
          (window as any).__AIOHA_TEST_LAST_LOGIN__ = undefined;
          stub.__currentUser = null;
          stub.__currentProvider = null;
          return { success: true };
        },
        __currentUser: null,
        __currentProvider: null,
      };

      (window as any).__AIOHA_TEST_STUB__ = stub;
      (window as any).__AIOHA_PENDING_STUB__ = stub;
    }, { username: DEFAULT_HIVE_USERNAME, providers: PROVIDERS });
  });

  for (const provider of PROVIDERS) {
    test(`${provider} login completes and persists auth state`, async ({ page }) => {
      await page.goto('/auth');

      await page.waitForFunction(() => typeof (window as any).__SET_AIOHA_STUB__ === 'function', null, {
        timeout: 15_000,
      });
      await page.evaluate(() => {
        if (typeof (window as any).__SET_AIOHA_STUB__ === 'function') {
          (window as any).__SET_AIOHA_STUB__((window as any).__AIOHA_PENDING_STUB__);
        }
      });

      await page.waitForFunction(
        () => Boolean((window as any).__AIOHA_DEBUG_STATE__?.isInitialized),
        null,
        { timeout: 10_000 }
      );

      const debugInfo = await page.evaluate(() => ({
        stubProviders: (window as any).__AIOHA_PENDING_STUB__?.getProviders?.(),
        debugState: (window as any).__AIOHA_DEBUG_STATE__,
        buttons: Array.from(document.querySelectorAll('button')).map((btn) =>
          btn.textContent?.trim()
        ),
      }));
      console.log(`DEBUG (${provider}):`, JSON.stringify(debugInfo));

      await page.getByRole('button', { name: providerLabelMap[provider] }).click();

      if (requiresUsername(provider)) {
        await expect(page.getByText(/Enter your Hive username/i)).toBeVisible();
        await page.getByPlaceholder(/Enter your Hive username/i).fill(DEFAULT_HIVE_USERNAME);
        await page.getByRole('button', { name: /continue/i }).click();
      }

      await expectFeedForUser(page, DEFAULT_HIVE_USERNAME);

      const lastLogin = await page.evaluate(() => (window as any).__AIOHA_TEST_LAST_LOGIN__);
      expect(lastLogin).toMatchObject({ provider, username: DEFAULT_HIVE_USERNAME });
    });
  }
});
