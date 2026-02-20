
# Workflow Orchestration – Senior Engineer Mode

## 1. Plan Mode Default
- Activate **plan mode** for any non-trivial task  
  (≥ 3 steps, architectural decisions, or risky changes)
- If behavior diverges / goes sideways → **STOP immediately**, do **not** keep pushing, re-plan
- Use plan mode heavily for **verification** steps — not only for initial building
- Write clear, checkable specs + verification criteria **before** writing code

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload to subagents:
  - Complex / multi-source research
  - Deep exploration
  - Parallel analysis paths
  - Heavy computation or long reasoning chains
- **Rule**: one focused, well-scoped task per subagent
- Skip self-reflection loop when delegating to subagents

## 3. After Any Correction / Self-Improvement Loop
After user points out mistake or serious regression:
- Immediately update `tasks/lessons.md`
- Write **clear, generalizable, preventive rules** that stop the exact same class of error
- Ruthlessly iterate these lessons session after session until recurrence rate collapses
- **At start of every project-relevant session**: skim relevant lessons first

## 4. Verification Before Declaring Done
- **Never** mark task complete without proving it actually works
- When relevant: show diff in behavior (old → new)
- Ask seriously: **“Would a staff+ engineer approve and merge this?”**
- Prefer hard evidence:
  - Passing tests
  - Clean logs
  - Reproduced correct behavior
  over “it seems fine”

## 5. Elegance (Balanced – avoid both hacky and over-engineered)
For any non-trivial change, pause and ask:
- “Is there a meaningfully **more elegant** / simpler / more idiomatic way?”
- If current fix feels hacky → prefer honesty (“I don’t see a clean solution yet”) over clever-but-fragile code
- Challenge your own diff before presenting
- Do **not** over-engineer obvious, simple fixes

## 6. Autonomous Bug Fixing
When given:
- Bug report
- Failing test output
- Error / stack trace
- Logs

**Expected behavior**:
- **Just fix it** — do not immediately ask for step-by-step hand-holding
- Use the context already provided (logs, errors, test names, repro steps)
- Zero “please tell me how to debug this” requests

## Task Management Discipline

1. **Plan First**  
   → Write concrete, checkable plan → `tasks/todo.md`

2. **Verify Plan**  
   → Internal or explicit check-in before heavy implementation

3. **Explain Changes**  
   → High-level “what & why” summary at each meaningful step

4. **Track Progress**  
   → Cross out / mark complete items in `todo.md` as you go

5. **Document Results**  
   → Add “Review / Outcome / Verification” section to task in `todo.md`

6. **Capture Lessons**  
   → After fixes / important realisations → update `tasks/lessons.md`

## Core Simplicity Mantra

- **Simplicity First** — every change must be as simple as reasonably possible  
- **No Laziness** — hunt **root causes**. No band-aids. Senior developer bar.  
- **Minimal Impact** — touch only what must be touched. Minimize new risk.

## Deployment

- Production URL: **https://sportsblock.app** (NOT sportsblock.xyz)
- Pushing to `main` triggers an automatic deploy via Vercel. Do NOT prompt the user to deploy — it happens on push.

## Project Overview

Sportsblock is a Next.js 15 (App Router) sports content platform integrated with the Hive blockchain. Users can authenticate via Hive wallets (Keychain, HiveSigner, HiveAuth) or Google OAuth, then read and publish sports-related posts to the Hive blockchain.

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
2. **Soft Auth** (Google OAuth via NextAuth): Google sign-in → custodial Hive account created, can download keys for full self-custody

`src/contexts/AiohaProvider.tsx` wraps the Aioha library for client-side wallet interactions.
`src/contexts/AuthContext.tsx` manages auth state and persists to localStorage.

### Custodial Onboarding Flow

Google OAuth users go through this flow:
1. Sign in with Google → NextAuth creates session → Prisma stores user
2. Redirect to `/onboarding/username` → user picks a Hive username (`sb-` prefix)
3. Server calls `create_claimed_account` using @niallon11's ACTs → real Hive account created
4. Keys encrypted + stored server-side → signing relay handles blockchain ops
5. User can download keys anytime (`/api/auth/keys/download`) for full self-custody

Key files:
- `src/app/api/hive/create-account/route.ts` — Account creation endpoint
- `src/app/api/auth/signing-relay/route.ts` — Custodial transaction signing
- `src/app/api/auth/keys/download/route.ts` — Key export for graduation
- `src/hooks/useBroadcast.ts` — Unified broadcast abstraction (handles both auth types)
- `src/app/onboarding/username/page.tsx` — Username picker page

### State Management

- **Zustand stores** (`src/stores/*`): Local UI state (posts, bookmarks, communities, modals)
- **React Query** (`src/lib/react-query/queries/*`): Server state with caching
- **Contexts** (`src/contexts/*`): Auth, theme, notifications, price data

### Hive Integration (`src/lib/hive-workerbee/`)

| File | Purpose |
| ------ | --------- |
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

## Playwright / Browser Testing Restrictions

**DO NOT use Playwright MCP tools to test this application.** The app requires the Hive Keychain browser extension for authentication, which is not available in Playwright's browser environment. Attempting to test with Playwright will result in:
- Infinite login modal loops (Keychain not detected)
- Inability to authenticate users
- Blocked UI flows that require wallet connection

For manual testing, use a real browser with Hive Keychain installed, or use the Google OAuth flow for basic testing.
