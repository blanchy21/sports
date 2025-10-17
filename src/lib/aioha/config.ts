import { initAioha } from '@aioha/aioha';

// Type for Aioha instance - simplified to avoid type conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AiohaInstance = any;

// Aioha configuration for Sportsblock
export const aiohaConfig = {
  hiveauth: {
    name: 'Sportsblock',
    description: 'Your escape to pure sports content - earn crypto rewards for your insights',
    logo: '/stadium.jpg', // Using the stadium image as app logo
  },
  hivesigner: {
    app: 'sportsblock.app',
    callbackURL: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
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

// Initialize Aioha instance only in browser environment
let aioha: AiohaInstance | null = null;

if (typeof window !== 'undefined') {
  aioha = initAioha(aiohaConfig);
}

export { aioha };
export default aioha;
