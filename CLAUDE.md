
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
- Ask seriously: **"Would a staff+ engineer approve and merge this?"**
- Prefer hard evidence:
  - Passing tests
  - Clean logs
  - Reproduced correct behavior
  over "it seems fine"

## 5. Elegance (Balanced – avoid both hacky and over-engineered)
For any non-trivial change, pause and ask:
- "Is there a meaningfully **more elegant** / simpler / more idiomatic way?"
- If current fix feels hacky → prefer honesty ("I don't see a clean solution yet") over clever-but-fragile code
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
- Zero "please tell me how to debug this" requests

## Task Management Discipline

1. **Plan First**
   → Write concrete, checkable plan → `tasks/todo.md`

2. **Verify Plan**
   → Internal or explicit check-in before heavy implementation

3. **Explain Changes**
   → High-level "what & why" summary at each meaningful step

4. **Track Progress**
   → Cross out / mark complete items in `todo.md` as you go

5. **Document Results**
   → Add "Review / Outcome / Verification" section to task in `todo.md`

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

**Key tech:** TypeScript, Tailwind CSS, Zustand + React Query, Prisma (PostgreSQL/Supabase), NextAuth, WorkerBee/Wax, Upstash Redis, Sentry, Framer Motion.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run dev:force        # Start with port cleanup script
npm run build            # prisma generate + next build
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
1. **Hive Auth** (WalletProvider): Keychain, HiveSigner → full blockchain posting
2. **Google OAuth** (NextAuth): Google sign-in → custodial Hive account created, can download keys for full self-custody

`src/contexts/WalletProvider.tsx` provides client-side wallet interactions (Keychain + HiveSigner).
`src/contexts/AuthContext.tsx` manages auth state and persists to localStorage.
`src/lib/hive/broadcast-client.ts` abstracts transaction broadcasting (routes to wallet or signing relay).

### Custodial Onboarding Flow

Google OAuth users go through this flow:
1. Sign in with Google → NextAuth creates session → Prisma stores user
2. Redirect to `/onboarding/username` → user picks a Hive username (`sb-` prefix)
3. Server calls `create_claimed_account` using account creation tokens → real Hive account created
4. Keys encrypted + stored server-side → signing relay handles blockchain ops
5. User can download keys anytime (`/api/hive/download-keys`) for full self-custody

Key files:
- `src/app/api/hive/create-account/route.ts` — Account creation endpoint
- `src/app/api/hive/sign/route.ts` — Custodial transaction signing relay
- `src/app/api/hive/download-keys/route.ts` — Key export for graduation
- `src/lib/hive/signing-relay.ts` — Signing relay logic (validates + broadcasts)
- `src/lib/hive/account-creation.ts` — Account creation logic
- `src/hooks/useBroadcast.ts` — Unified broadcast abstraction (handles both auth types)
- `src/app/onboarding/username/page.tsx` — Username picker page

### Database (Prisma + PostgreSQL)

- Schema at `prisma/schema.prisma`
- Client at `src/lib/db/prisma.ts`
- Custodial users, soft posts/comments/likes, notifications, metrics all stored in PostgreSQL via Prisma
- Hive posts/comments/votes stored on the Hive blockchain

### State Management

- **Zustand stores** (`src/stores/*`): Local UI state (posts, bookmarks, communities, modals)
- **React Query** (`src/lib/react-query/queries/*`): Server state with caching
- **Contexts** (`src/contexts/*`): Auth, theme, notifications, price data

### Key API Route Groups (`src/app/api/`)

| Group | Purpose |
| ----- | ------- |
| `/api/hive/*` | Blockchain operations (posts, comments, voting, accounts, signing relay) |
| `/api/hive-engine/*` | Hive Engine tokens (balances, staking, transfers, market) |
| `/api/soft/*` | Custodial user operations (comments, likes, follows, notifications) |
| `/api/unified/*` | Merged Hive + custodial data (posts, sportsbites) |
| `/api/match-threads/*` | Live match thread CRUD |
| `/api/cron/*` | Scheduled tasks (rewards, cleanup, analytics) |
| `/api/auth/*` | NextAuth + session endpoints |
| `/api/communities/*` | Community browsing and membership |

### Sports Community Config
The app targets the `hive-115814` community. Configuration in `src/lib/hive-workerbee/client.ts` (`SPORTS_ARENA_CONFIG`).

## Key Patterns

### Path Alias
All imports use `@/*` alias mapped to `src/*`:
```typescript
import { useAuth } from '@/contexts/AuthContext';
```

### Error Handling in API Routes
Use `src/lib/utils/api-retry.ts` for retryable Hive node calls.
Use `src/lib/api/response.ts` for standardized API responses (`createApiHandler`, `apiSuccess`, `apiError`).
Use `src/lib/api/session-auth.ts` for session-based auth in API routes (`getAuthenticatedUserFromSession`).

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
