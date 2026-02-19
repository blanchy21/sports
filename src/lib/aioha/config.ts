import { Aioha } from '@aioha/aioha';

// Type for Aioha instance - using unknown for better type safety
type AiohaInstance = unknown;

declare global {
  interface Window {
    __AIOHA_TEST_STUB__?: unknown;
    __AIOHA_FORCE_STUB__?: boolean;
    __SET_AIOHA_STUB__?: (stub: unknown) => void;
  }
}

export const AIOHA_STUB_EVENT = '__AIOHA_STUB_APPLIED__';

// Aioha configuration for Sportsblock
export const aiohaConfig = {
  hiveauth: {
    name: 'Sportsblock',
    description: 'Your escape to pure sports content - earn crypto rewards for your insights',
    icon: typeof window !== 'undefined' ? `${window.location.origin}/stadium.jpg` : '/stadium.jpg',
  },
  hivesigner: {
    app: 'sportsblock',
    callbackURL: typeof window !== 'undefined' ? `${window.location.origin}/hivesigner.html` : '',
    scope: ['login', 'vote', 'comment', 'post'],
  },
};

let aioha: AiohaInstance | null = null;
let stubApplied = false;

const notifyStubApplied = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AIOHA_STUB_EVENT, { detail: aioha }));
  }
};

const applyStub = (stub: unknown | undefined) => {
  stubApplied = true;
  if (typeof stub !== 'undefined') {
    aioha = stub as AiohaInstance;
    notifyStubApplied();
  }
};

const initializeAioha = () => {
  if (typeof window === 'undefined') {
    return;
  }
  if (!stubApplied) {
    // Manual setup instead of initAioha() to avoid registering MetaMask Snap,
    // which probes window.ethereum and triggers popups from non-Hive wallets
    // (Phantom, MetaMask, Coinbase Wallet, etc.).
    const instance = new Aioha();
    instance.registerKeychain();
    instance.registerLedger();
    instance.registerPeakVault();
    instance.registerHiveAuth(aiohaConfig.hiveauth);
    instance.registerHiveSigner(aiohaConfig.hivesigner);
    instance.loadAuth();
    aioha = instance;
  }
};

export const setAiohaTestStub = (stub: unknown) => {
  applyStub(stub);
};

export const getAiohaInstance = () => aioha;

if (typeof window !== 'undefined') {
  const existingStub = window.__AIOHA_TEST_STUB__;

  Object.defineProperty(window, '__AIOHA_TEST_STUB__', {
    get() {
      return aioha;
    },
    set(value) {
      applyStub(value);
    },
    configurable: true,
  });

  window.__SET_AIOHA_STUB__ = (stub: unknown) => {
    applyStub(stub);
  };

  const shouldUseStub = Boolean(window.__AIOHA_FORCE_STUB__);

  if (existingStub !== undefined) {
    applyStub(existingStub);
  } else if (shouldUseStub) {
    applyStub(window.__AIOHA_TEST_STUB__);
  } else {
    initializeAioha();
  }
}

export { aioha };
export default aioha;
