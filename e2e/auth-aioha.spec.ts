import { test, expect } from '@playwright/test';

const DEFAULT_HIVE_USERNAME = process.env.PLAYWRIGHT_HIVE_USERNAME || 'blanchy';
const PROVIDERS = ['keychain', 'hiveauth', 'hivesigner'] as const;

interface AiohaLoginSuccess {
  success: true;
  provider: string;
  username: string;
  user: { username: string };
  account: { name: string };
}

type AiohaEventHandler = (...args: unknown[]) => void;

interface AiohaStub {
  getProviders: () => readonly string[];
  getCurrentUser: () => { username: string } | null;
  getCurrentProvider: () => string | null;
  getOtherLogins: () => unknown[];
  isLoggedIn: () => boolean;
  login: (provider: string, suppliedUsername?: string) => Promise<AiohaLoginSuccess>;
  on: (event: string, handler: AiohaEventHandler) => void;
  off: (event: string, handler: AiohaEventHandler) => void;
  logout: () => Promise<{ success: true }>;
  __currentUser: { username: string } | null;
  __currentProvider: string | null;
}

interface AiohaTestWindow extends Window {
  __AIOHA_FORCE_STUB__?: boolean;
  __AIOHA_TEST_STUB__?: AiohaStub;
  __AIOHA_PENDING_STUB__?: AiohaStub;
  __AIOHA_TEST_LAST_LOGIN__?: { provider: string; username: string };
  __SET_AIOHA_STUB__?: (stub: unknown) => void;
  __AIOHA_DEBUG_STATE__?: {
    isInitialized?: boolean;
  };
}

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

      const testWindow = window as unknown as AiohaTestWindow;
      testWindow.__AIOHA_FORCE_STUB__ = true;

      const listeners = new Map<string, Set<AiohaEventHandler>>();

      const stub: AiohaStub = {
        getProviders: () => providers,
        getCurrentUser: () => stub.__currentUser ?? null,
        getCurrentProvider: () => stub.__currentProvider,
        getOtherLogins: () => [],
        isLoggedIn: () => Boolean(stub.__currentUser),
        async login(provider: string, suppliedUsername?: string) {
          const finalUsername = suppliedUsername && suppliedUsername.trim().length > 0 ? suppliedUsername : username;
          testWindow.__AIOHA_TEST_LAST_LOGIN__ = { provider, username: finalUsername };
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
          testWindow.__AIOHA_TEST_LAST_LOGIN__ = undefined;
          stub.__currentUser = null;
          stub.__currentProvider = null;
          return { success: true };
        },
        __currentUser: null,
        __currentProvider: null,
      };

      testWindow.__AIOHA_TEST_STUB__ = stub;
      testWindow.__AIOHA_PENDING_STUB__ = stub;
    }, { username: DEFAULT_HIVE_USERNAME, providers: PROVIDERS });
  });

  for (const provider of PROVIDERS) {
    test(`${provider} login completes and persists auth state`, async ({ page }) => {
      await page.goto('/auth');

      await page.waitForFunction(() => {
        const testWindow = window as unknown as AiohaTestWindow;
        return typeof testWindow.__SET_AIOHA_STUB__ === 'function';
      }, null, {
        timeout: 15_000,
      });
      await page.evaluate(() => {
        const testWindow = window as unknown as AiohaTestWindow;
        if (typeof testWindow.__SET_AIOHA_STUB__ === 'function' && testWindow.__AIOHA_PENDING_STUB__) {
          testWindow.__SET_AIOHA_STUB__(testWindow.__AIOHA_PENDING_STUB__);
        }
      });

      await page.waitForFunction(
        () => {
          const testWindow = window as unknown as AiohaTestWindow;
          return Boolean(testWindow.__AIOHA_DEBUG_STATE__?.isInitialized);
        },
        null,
        { timeout: 10_000 }
      );

      const debugInfo = await page.evaluate(() => ({
        stubProviders: (window as unknown as AiohaTestWindow).__AIOHA_PENDING_STUB__?.getProviders?.(),
        debugState: (window as unknown as AiohaTestWindow).__AIOHA_DEBUG_STATE__,
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

      const lastLogin = await page.evaluate(() => {
        const testWindow = window as unknown as AiohaTestWindow;
        return testWindow.__AIOHA_TEST_LAST_LOGIN__ ?? null;
      });
      expect(lastLogin).toMatchObject({ provider, username: DEFAULT_HIVE_USERNAME });
    });
  }
});
