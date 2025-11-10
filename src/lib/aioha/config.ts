import { initAioha } from '@aioha/aioha';

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
    logo: '/stadium.jpg', // Using the stadium image as app logo
  },
  hivesigner: {
    app: 'sportsblock.app',
    callbackURL: typeof window !== 'undefined' ? `${window.location.origin}/hivesigner.html` : '',
    scope: ['login', 'vote', 'comment', 'post'],
  },
  keychain: {
    app: 'sportsblock.app',
  },
  ledger: {
    // Ledger specific configuration
  },
  peakvault: {
    // Peak Vault specific configuration
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
    aioha = initAioha(aiohaConfig);
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
