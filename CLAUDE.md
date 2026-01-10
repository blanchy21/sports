# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sportsblock is a Next.js 15 (App Router) sports content platform integrated with the Hive blockchain. Users can authenticate via Hive wallets (Keychain, HiveSigner, HiveAuth) or Firebase email, then read and publish sports-related posts to the Hive blockchain.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run dev:force        # Start with port cleanup script
npm run build            # Production build
npm run lint             # ESLint

# Testing
npm run test             # Jest unit tests
npm run test -- --watch  # Watch mode
npm run test -- tests/api                    # API route tests only
npm run test -- tests/components             # Component tests only
npm run test -- -t "test name pattern"       # Run specific test by name

# WorkerBee integration tests (require network)
npm run test:workerbee:integration           # Full suite
npm run test:workerbee                       # CLI harness

# E2E tests (Playwright)
npx playwright install                       # First time setup
npm run test:e2e                             # Run all E2E tests
npm run test:e2e:headed                      # Interactive mode
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e # Skip if dev server running
```

## Architecture

### Server/Client Boundary (Critical)

WorkerBee and Wax (Hive blockchain WASM libraries) run **server-side only**. They are:
- Externalized in `next.config.ts` for client bundles
- Accessed via API routes at `src/app/api/hive/*`
- Never imported directly in client components

Client components must call API routes to interact with Hive:
```typescript
// Client component - use API route
const response = await fetch('/api/hive/posts?community=hive-115814');

// Server-side only - can import directly
import { getWorkerBeeClient } from '@/lib/hive-workerbee/client';
```

### Authentication Flow

Two auth paths converge in `AuthContext`:
1. **Hive Auth** (Aioha): Keychain, HiveSigner, HiveAuth, Ledger, PeakVault → full blockchain posting
2. **Soft Auth** (Firebase): Email/password → read-only, can upgrade to Hive

`src/contexts/AiohaProvider.tsx` wraps the Aioha library for client-side wallet interactions.
`src/contexts/AuthContext.tsx` manages auth state and persists to localStorage.

### State Management

- **Zustand stores** (`src/stores/*`): Local UI state (posts, bookmarks, communities, modals)
- **React Query** (`src/lib/react-query/queries/*`): Server state with caching
- **Contexts** (`src/contexts/*`): Auth, theme, notifications, price data

### Hive Integration (`src/lib/hive-workerbee/`)

| File | Purpose |
|------|---------|
| `client.ts` | WorkerBee/Wax singleton, node configuration |
| `content.ts` | Fetch posts from Hive community |
| `posting.ts` | Create/broadcast posts and comments |
| `voting.ts` | Upvote/downvote operations |
| `account.ts` | User account data fetching |
| `realtime.ts` | Block streaming for live updates |

### API Routes (`src/app/api/`)

- `/api/hive/posts` - Fetch community posts
- `/api/hive/comments` - Post comments
- `/api/hive/posting` - Create posts
- `/api/hive/realtime` - Realtime feed
- `/api/hive/account/summary` - User account data
- `/api/crypto/prices` - HIVE/HBD price data

## Key Patterns

### Path Alias
All imports use `@/*` alias mapped to `src/*`:
```typescript
import { useAuth } from '@/contexts/AuthContext';
```

### Sports Community Config
The app targets the `hive-115814` community (Sportsblock). Configuration in `src/lib/hive-workerbee/client.ts`:
```typescript
export const SPORTS_ARENA_CONFIG = {
  APP_NAME: 'sportsblock',
  COMMUNITY_ID: 'hive-115814',
  TAGS: ['sportsblock', 'hive-115814'],
  DEFAULT_BENEFICIARIES: [{ account: 'sportsblock', weight: 500 }]
};
```

### Error Handling in API Routes
Use `src/lib/utils/api-retry.ts` for retryable Hive node calls.

### Image Handling
External images are proxied through `/api/image-proxy` to handle CORS. Allowed domains configured in `next.config.ts`.

## Testing Notes

- Jest tests use `jsdom` environment with custom module mappings for Wax/WorkerBee
- WorkerBee integration tests skipped by default (require `RUN_WORKERBEE_TESTS=true`)
- E2E tests can set `PLAYWRIGHT_HIVE_USERNAME` for authenticated flows
- Test utilities in `tests/test-utils.tsx` and `tests/api/test-server.ts`
