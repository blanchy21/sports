
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

## Git Workflow

**All changes go through PRs — never push directly to main.**

Branch protection is enforced (`enforce_admins: true`). Required CI checks: `Lint & Type Check`, `Unit Tests`, `Build`.

1. **Branch** → `git checkout -b fix/short-description` (or `feat/`, `chore/`)
2. **Commit** → commit to the feature branch
3. **Verify locally** → `npx tsc --noEmit` before pushing (catches type errors in ~20s vs 7min build)
4. **Push** → `git push -u origin fix/short-description`
5. **PR** → `gh pr create --title "..." --body "..."`
6. **CI passes** → all 3 checks must be green
7. **Merge** → `gh pr merge --squash` (or ask user)
8. **Deploy** → merging to `main` auto-deploys via Vercel. Do NOT prompt the user to deploy.

## Deployment

- Production URL: **https://sportsblock.app** (NOT sportsblock.xyz)
- Merging to `main` triggers an automatic deploy via Vercel. Do NOT prompt the user to deploy — it happens on merge.

## Project Overview

Sportsblock is a Next.js 15 (App Router) sports content platform integrated with the Hive blockchain. Users can authenticate via Hive wallets (Keychain, HiveSigner, HiveAuth) or Google OAuth, then read and publish sports-related posts to the Hive blockchain.

**Key tech:** TypeScript, Tailwind CSS, Zustand + React Query, Prisma (PostgreSQL/Supabase), NextAuth, WorkerBee/Wax, Upstash Redis, Sentry, Framer Motion.

## Brand Identity

Full brand docs live in `docs/brand/` (7 files). Key rules below.

### Archetype & Voice
- **Primary archetype:** The Outlaw. **Secondary:** The Hero.
- **Core promise:** "Your sports knowledge is worth real money."
- **Tagline:** Pure Sports. Real Rewards.
- **Voice:** Short sentences. Sports vernacular. Active voice. Challenge the user. Never explain the tech. No corporate hedging. `MEDALS` always capitalised.

### Colour System
Two accent colours with strict emotional split — **Teal = action/earning**, **Gold = reward/prestige**. Dark backgrounds only. No white screens.

**Backgrounds:**
| Token | Hex | Usage |
|-------|-----|-------|
| `sb-void` | `#0D0D0D` | Page background (never pure `#000`) |
| `sb-pitch` | `#111518` | Nav bar, top chrome |
| `sb-stadium` | `#161B1E` | Primary card surfaces |
| `sb-turf` | `#1E2A2F` | Elevated cards, modals |
| `sb-floodlight` | `#243038` | Hover/active states |

**Teal accent (action/earning):**
| Token | Hex | Usage |
|-------|-----|-------|
| `sb-teal` | `#00C49A` | Primary CTAs, links, active states |
| `sb-teal-deep` | `#00A882` | Hover state for teal |
| `sb-teal-flash` | `#00E5B4` | Highlights, notification dots |
| `sb-teal-shadow` | `#0A3D30` | Tinted backgrounds, win states |

**Gold accent (reward/prestige):**
| Token | Hex | Usage |
|-------|-----|-------|
| `sb-gold` | `#E8A020` | MEDALS token UI everywhere |
| `sb-gold-shine` | `#F5C355` | Hover state for gold, stars |
| `sb-gold-deep` | `#C07A10` | Active/pressed gold |
| `sb-gold-shadow` | `#3D2800` | MEDALS balance card backgrounds |

**Text & borders:**
| Token | Hex | Usage |
|-------|-----|-------|
| `sb-text-primary` | `#F0F0F0` | Headlines, hero text |
| `sb-text-body` | `#C8CDD0` | Body copy |
| `sb-text-muted` | `#888E94` | Meta, timestamps |
| `sb-border` | `#3A4248` | Card borders, dividers |
| `sb-border-subtle` | `#2A3238` | Ghost borders |

**Semantic states:**
| State | Foreground | Background |
|-------|-----------|------------|
| Correct/Win | `#00C49A` | `#0A3D30` |
| Wrong/Loss | `#E84040` | `#3D0A0A` |
| Pending/Live | `#E8A020` | `#3D2800` |

**Colour rules (never break):**
1. Teal = action, Gold = reward. Never swap.
2. Never use teal + gold on the same element.
3. Dark backgrounds only. No white screens.
4. MEDALS token UI is always gold (`#E8A020`).
5. Red is reserved for loss/wrong only — never general warnings.

### Typography
| Role | Font | Weights | CSS Variable |
|------|------|---------|-------------|
| **Display** (headlines, scores) | Barlow Condensed | 400, 600, 700, 800 | `--font-display` |
| **Body / UI** (copy, labels, buttons) | Inter | 400, 500, 600 | `--font-body` |
| **Monospace** (MEDALS, addresses) | JetBrains Mono | 400 | `--font-mono` |

**Type scale:**
| Name | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| Display XL | Barlow Condensed | 72px | 700–800 | 0.9 |
| Display L (H1) | Barlow Condensed | 48px | 700 | 0.95 |
| Display M (H2) | Barlow Condensed | 36px | 700 | 1.0 |
| Display S (H3) | Barlow Condensed | 24px | 600 | 1.1 |
| Body L | Inter | 16px | 400 | 1.65 |
| Body M | Inter | 14px | 400 | 1.6 |
| Label | Inter | 12px | 500 | 1.3 |
| Caption | Inter | 11px | 400 | 1.4 |
| MEDALS | JetBrains Mono | 14–16px | 400 | 1.4 |

**Typography rules (never break):**
1. Barlow Condensed for display only. Inter for everything you read.
2. MEDALS amounts always `font-mono` + `text-sb-gold`.
3. Uppercase for display headlines and short UI labels only.
4. No font sizes below 11px.
5. Use tabular numbers (`font-feature-settings: 'tnum' 1`) on scores, balances, leaderboards.

### Motion
- Only animate `transform` and `opacity` — never layout properties.
- **Easing:** Snap (`cubic-bezier(0.4, 0, 0.2, 1)`) for default UI; Spring (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for win states only.
- **Durations:** 80ms instant, 150ms hover, 250ms state changes, 350ms enter/exit, 500ms reveals, 800ms MEDALS counter.
- Spring easing on wins only — never on losses/errors.
- MEDALS balance always animates from previous to new value (never jumps).
- Spinners only during blockchain writes; all other loading uses skeleton shimmer.
- Stagger list items at 60ms intervals.
- Respect `prefers-reduced-motion`.

### Logo
- **Mark:** Hexagonal badge with upward chevron + base dot. Teal fill (`#00C49A`), dark interior (`#051A14`).
- **Wordmark:** `SPORTS` in `#F0F0F0` + `BLOCK` in `#00C49A`. Font: Barlow Condensed 700.
- **Sportsbites sub-brand:** Hexagonal badge with lightning bolt. `SPORTS` in `#F0F0F0` + `BITES` in `#E8A020` (gold).
- SVG files in `public/logo/`. React component in `components/ui/Logo.tsx`.
- Sportsbites logo pack in `public/logo/sportsbites/sportsbites-logo-pack/`.
- Never use gold in the SportsBlock logo. Never rotate/skew. No shadows/gradients.

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

# Marketing Pipeline (Buffer + Figma)
node marketing/x-pipeline/buffer-upload.js              # Upload CSV posts to Buffer (with images)
node marketing/x-pipeline/buffer-upload.js --dry-run    # Preview posts without uploading
node marketing/x-pipeline/buffer-upload.js --list       # Show current Buffer queue
node marketing/x-pipeline/buffer-upload.js --clear      # Delete all scheduled posts
node marketing/x-pipeline/generate-posts.js             # Regenerate tweet copy library (156 variants)
node marketing/x-pipeline/add-buffer-columns.js         # One-time: add tweet_text/buffer_priority columns to CSV
```

## Marketing Pipeline

### Overview

Single-CSV workflow for scheduling Twitter/X posts via Buffer API with Figma brand card images.

**Source of truth:** `marketing/sportsblock-marketing-matrix.csv`

### Workflow

1. **Edit CSV** → Set `tweet_text` and `buffer_priority` (1 = posts first) for any row
2. **Figma Desktop** → Run `sportsblock-plugin` plugin to generate/update brand cards
3. **Export PNGs** → Save 2x PNGs from Figma to `public/marketing/assets/` (kebab-case: `contest-card-void-ipl-contest.png`)
4. **Push to main** → Vercel auto-deploys, images go live at `sportsblock.app/marketing/assets/`
5. **Upload** → `node marketing/x-pipeline/buffer-upload.js`

### Key Files

| File | Purpose |
|------|---------|
| `marketing/sportsblock-marketing-matrix.csv` | Master content matrix (92 rows, all templates/themes/CTAs) |
| `marketing/x-pipeline/buffer-upload.js` | CSV-driven Buffer API uploader (GraphQL, auto-attaches images) |
| `marketing/x-pipeline/generate-posts.js` | Generates 156 tweet copy variants → `output/tweet-copy.md` |
| `marketing/x-pipeline/output/tweet-copy.md` | All tweet copy organized by content type and theme |
| `marketing/x-pipeline/output/buffer-schedule.csv` | Full 156-tweet schedule (reference, not used by uploader) |
| `marketing/x-pipeline/output/top-10-buffer-queue.md` | Curated launch sequence |
| `public/marketing/assets/` | Exported Figma PNGs (served via Vercel CDN) |

### CSV Columns for Buffer

| Column | Purpose |
|--------|---------|
| `tweet_text` | Exact tweet copy posted to Twitter/X via Buffer |
| `buffer_priority` | Number (1 = highest priority). Leave blank to skip row |

Image filenames are auto-derived from `template` + `theme` + `cta_id` → `{template}-{theme}-{cta_id}.png`

### Buffer API

- **Endpoint:** `https://api.buffer.com/graphql`
- **Auth:** Bearer token (set via `BUFFER_TOKEN` env var or inline in script)
- **Channel:** `@sportsblockinfo` (ID: `69b82d2f7be9f8b17160a1e9`)
- **Org:** `698132498f84ce3a77e3dd9c`
- **Free plan limit:** 10 scheduled posts at a time
- **Schedule:** 3 posts/day at 09:00, 13:00, 18:00 UTC

### Figma Plugin

Located at `/Users/paulblanche/Desktop/sportsblock-plugin/` (separate repo, not in this project).

Generates brand cards across 5 templates × 4 themes × 8 CTA types:
- **Templates:** Social Post (1200×630), Prediction Card (1200×630), Contest Card (1200×630), Instagram (1080×1080), Story (1080×1920), Sportsbite Card (1200×630)
- **Themes:** Void, Stadium, Teal Accent, Gold Prestige
- **Logos:** SportsBlock (hex + chevron) on all cards, Sportsbites (hex + lightning bolt) on sportsbite cards

Run from Figma Desktop only (browser Figma cannot run local dev plugins).

### Content Types

| Type | Template | Use For |
|------|----------|---------|
| Earn Rewards | Social Post, Prediction Card | Core value prop — earning MEDALS |
| Pure Community | Social Post | No-noise sports community positioning |
| True Ownership | Social Post | Blockchain/Web3 ownership angle |
| Prediction Bites | Prediction Card | Match prediction staking |
| IPL Contest | Contest Card, Social Post | IPL 2026 prediction contest (time-sensitive) |
| Masters Contest | Contest Card, Social Post | Masters 2026 golf contest |
| Sportsbites | Social Post, Sportsbite Card | Hot takes, quick-fire content |
| Long-Form | Social Post | Deep analysis, match previews |

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

Two sign-up methods converge in `AuthContext` — every user ends up with a real Hive account and their own keys:
1. **Hive Auth** (WalletProvider): Keychain, HiveSigner → existing Hive users connect directly
2. **Google OAuth** (NextAuth): Google sign-in → Hive account created during onboarding, keys downloaded by user

`src/contexts/WalletProvider.tsx` provides client-side wallet interactions (Keychain + HiveSigner).
`src/contexts/AuthContext.tsx` manages auth state and persists to localStorage.
`src/lib/hive/broadcast-client.ts` abstracts transaction broadcasting (routes to wallet or signing relay).

### Google OAuth Onboarding Flow

Google OAuth users go through this flow:
1. Sign in with Google → NextAuth creates session → Prisma stores user
2. Redirect to `/onboarding/username` → user picks a Hive username (`sb-` prefix)
3. Server calls `create_claimed_account` using account creation tokens → real Hive account created
4. User downloads their Hive keys during onboarding
5. Managed signing relay available as a convenience for blockchain operations

Key files:
- `src/app/api/hive/create-account/route.ts` — Account creation endpoint
- `src/app/api/hive/sign/route.ts` — Managed signing relay endpoint
- `src/app/api/hive/download-keys/route.ts` — Key download endpoint
- `src/lib/hive/signing-relay.ts` — Signing relay logic (validates + broadcasts)
- `src/lib/hive/account-creation.ts` — Account creation logic
- `src/hooks/useBroadcast.ts` — Unified broadcast abstraction (handles both auth types)
- `src/app/onboarding/username/page.tsx` — Username picker page

### Database (Prisma + PostgreSQL)

- Schema at `prisma/schema.prisma`
- Client at `src/lib/db/prisma.ts`
- User accounts (Google sign-up), notifications, metrics stored in PostgreSQL via Prisma
- Posts, comments, and votes stored on the Hive blockchain
- **Direct DB access** (for schema changes, queries, debugging):
  ```bash
  source .env && psql "$DATABASE_URL" -c "SELECT * FROM custodial_users LIMIT 5;"
  ```
  The `DATABASE_URL` is in `.env` (Supabase pooler, port 6543). `psql` is available via Homebrew.
- **Schema changes**: `prisma db push` hangs on the Supabase pooler. Use `psql` with `ALTER TABLE` for column additions, then update `prisma/schema.prisma` and run `npx prisma generate`.
- **Do NOT use** `prisma migrate dev` — the project uses `db push` / direct SQL, not migrations.

### State Management

- **Zustand stores** (`src/stores/*`): Local UI state (posts, bookmarks, communities, modals)
- **React Query** (`src/lib/react-query/queries/*`): Server state with caching
- **Contexts** (`src/contexts/*`): Auth, theme, notifications, price data

### Key API Route Groups (`src/app/api/`)

| Group | Purpose |
| ----- | ------- |
| `/api/hive/*` | Blockchain operations (posts, comments, voting, accounts, signing relay) |
| `/api/hive-engine/*` | Hive Engine tokens (balances, staking, transfers, market) |
| `/api/soft/*` | Legacy endpoints — Prisma-backed operations (comments, likes, follows, notifications) |
| `/api/unified/*` | Merged Hive + database endpoints (posts, sportsbites) |
| `/api/match-threads/*` | Live match thread CRUD |
| `/api/cron/*` | Scheduled tasks (rewards, cleanup, analytics) |
| `/api/auth/*` | NextAuth + session endpoints |
| `/api/communities/*` | Community browsing and membership |

### Sports Community Config
The app targets the `hive-115814` community. Configuration in `src/lib/hive-workerbee/client.ts` (`SPORTS_ARENA_CONFIG`).

### Sportsbites (Short-Form Content)

Quick-fire hot takes (max 280 chars) with optional polls, images, GIFs, and emoji reactions. Published to the Hive blockchain as comments under a daily container post.

**Data flow:** User composes → `createSportsbiteOperation()` → Hive blockchain (comment under `sportsbites` parent author) → cached in-memory (LRU, 20s feed / 30s single).

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/hive-workerbee/sportsbite-ops.ts` | Validation, operation building, daily container permlinks |
| `src/lib/hive-workerbee/sportsbites.ts` | Fetching, 7-day rolling window aggregation, LRU cache |
| `src/lib/react-query/queries/useSportsbites.ts` | React Query hooks |
| `src/components/sportsbites/ComposeSportsbite.tsx` | Compose form (280 char limit, polls, images) |
| `src/components/sportsbites/SportsbitesFeed.tsx` | Infinite scroll feed |
| `src/components/sportsbites/SportsbiteCard.tsx` | Single sportsbite display |
| `src/components/sportsbites/EmojiReactions.tsx` | 6 emoji reactions (fire, shocked, laughing, angry, eyes, thumbs_down) |
| `src/components/sportsbites/QuickPoll.tsx` | Embedded 2-option polls |
| `src/components/sportsbites/TipButton.tsx` | MEDALS tipping |
| `src/app/sportsbites/page.tsx` | Main feed page |

**API routes:** `/api/hive/sportsbites` (GET feed), `/api/hive/sportsbites/ensure-container` (POST daily container), `/api/soft/sportsbites` (POST create/update), `/api/soft/reactions` (POST), `/api/soft/poll-votes` (POST), `/api/unified/sportsbites` (GET merged).

**DB models:** `Sportsbite`, `Reaction`, `PollVote`, `Tip`.

### Predictions (Prediction Bites / Prediction Markets)

Peer-to-peer prediction markets using MEDALS tokens. Pari-mutuel odds — no house edge. Two-admin settlement approval flow.

**Lifecycle:** OPEN → LOCKED (at `locksAt` time) → PENDING_APPROVAL (admin proposes) → SETTLING (second admin approves) → SETTLED or VOID.

**Odds calculation (pari-mutuel):** Multiplier = Total Pool / Winning Pool. Fee split: configurable platform % + burn %. Payout = Stake × Multiplier.

**Data flow:** User creates prediction → stakes transferred to escrow account (`sp-predictions`) via Hive Engine → locks at deadline → admin proposes settlement → second admin approves → payouts broadcast to winners via Hive Engine.

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/predictions/types.ts` | Core types (`PredictionBite`, `CreatePredictionInput`, `PlaceStakeInput`) |
| `src/lib/predictions/settlement.ts` | Pari-mutuel calculation, two-admin approval, payout distribution |
| `src/lib/predictions/stake-token.ts` | Entry token generation (HMAC signed, 5-min expiry) |
| `src/lib/predictions/escrow.ts` | Hive Engine transfer operations (payouts, fees, refunds) |
| `src/lib/predictions/constants.ts` | Fee percentages, burn account, escrow account |
| `src/lib/predictions/serialize.ts` | DB model → API response transformation |
| `src/hooks/usePredictions.ts` | Fetch predictions |
| `src/hooks/usePredictionStake.ts` | Stake placement flow |
| `src/hooks/usePredictionSettlement.ts` | Settlement proposal flow |
| `src/stores/predictionStore.ts` | Zustand: stake modal, settlement panel state |
| `src/components/predictions/PredictionBiteCard.tsx` | Prediction display with odds bars |
| `src/components/predictions/PredictionStakeModal.tsx` | Stake entry modal |
| `src/components/predictions/PredictionSettlementPanel.tsx` | Admin settlement UI |
| `src/app/predictions/page.tsx` | Main predictions feed |
| `src/app/predictions/leaderboard/page.tsx` | Leaderboard (wins, losses, profit, streak) |

**API routes:** `/api/predictions` (GET list, POST create), `/api/predictions/[id]` (GET), `/api/predictions/[id]/stake` (POST generate token), `/api/predictions/[id]/stake/confirm` (POST broadcast), `/api/predictions/[id]/settle` (POST), `/api/predictions/[id]/approve` (POST), `/api/predictions/[id]/reject` (POST), `/api/predictions/[id]/void` (POST), `/api/predictions/[id]/comments` (GET/POST), `/api/predictions/leaderboard` (GET), `/api/predictions/stats` (GET).

**DB models:** `Prediction`, `PredictionOutcome`, `PredictionStake`, `PredictionComment`, `PredictionEscrowLedger`.

### Contests (Tournament Framework)

Generic contest framework with pluggable contest types. Supports free and paid entry, sponsor-funded or fee-funded prize pools.

**Prize models:** FIXED (sponsor-funded, entry fees burned) or FEE_FUNDED (pool = sum of entry fees). Default payout split (top 3): 60% / 25% / 15%.

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/contests/settlement.ts` | Prize calculation, tie-breakers, payout distribution |
| `src/lib/contests/entry-token.ts` | Entry token generation (same HMAC pattern as predictions) |
| `src/lib/contests/escrow.ts` | Hive Engine fee/payout operations |
| `src/lib/contests/constants.ts` | Fee config |
| `src/stores/contestStore.ts` | Zustand: entry modal state |

**API routes:** `/api/contests` (GET/POST), `/api/contests/[slug]` (GET), `/api/contests/[slug]/enter` (POST), `/api/contests/[slug]/enter/confirm` (POST), `/api/contests/[slug]/settle` (POST), `/api/contests/[slug]/cancel` (POST), `/api/contests/[slug]/leaderboard` (GET), `/api/contests/[slug]/teams` (GET), `/api/contests/[slug]/matches` (GET/POST results).

**DB models:** `Contest`, `ContestEntry`, `ContestMatch`, `ContestTeam`, `ContestEscrowLedger`, `ContestInterest`.

#### IPL Boundary BlackJack

Cricket contest: guess total boundaries (4s + 6s) per IPL match. Guess ≤ actual = score your guess as points. Guess > actual = bust (0 points). Highest total across all matches wins.

**Key files:** `src/lib/ipl-bb/types.ts`, `src/lib/ipl-bb/utils.ts`. Components in `src/components/ipl-bb/`.
**Pages:** `/app/contests/ipl-boundary-blackjack/[competitionId]/page.tsx`, `/app/admin/ipl-bb/page.tsx`.
**API:** `/api/ipl-bb/competitions` (GET), `/api/ipl-bb/competition/[id]` (GET), `/api/ipl-bb/competition/[id]/join` (POST), `/api/ipl-bb/competition/[id]/pick` (POST guess), `/api/ipl-bb/competition/[id]/my-picks` (GET), `/api/ipl-bb/competition/[id]/leaderboard` (GET), admin routes for resolve/create.
**DB models:** `IplBbCompetition`, `IplBbMatch`, `IplBbEntry`, `IplBbPick`.
**Storage:** Postgres only (no blockchain dependency).

#### Last Man Standing (LMS)

Elimination game: pick one Premier League team per gameweek. Team wins/draws → survive. Team loses → eliminated. Can't reuse same team across the competition.

**Key files:** `src/lib/lms/types.ts`, `src/lib/lms/utils.ts`, `src/lib/lms/teams.ts` (PL_TEAMS_2526).
**Pages:** `/app/contests/last-man-standing/page.tsx`, `/app/admin/lms/page.tsx`.
**API:** `/api/lms/competitions` (GET), `/api/lms/competition/[id]` (GET), `/api/lms/competition/[id]/join` (POST), `/api/lms/competition/[id]/pick` (POST), `/api/lms/competition/[id]/my-pick` (GET), `/api/lms/competition/[id]/board` (GET), admin routes for resolve/autopick.
**DB models:** `LmsCompetition`, `LmsEntry`, `LmsPick`, `LmsGameweek`.
**Storage:** Postgres only (no blockchain dependency).

### Blockchain vs Database by Feature

| Feature | Content Storage | Token/Money Flow | Local DB |
|---------|----------------|-----------------|----------|
| Sportsbites | Hive blockchain (comments) | MEDALS tips via Hive Engine | Soft posts, reactions, poll votes |
| Predictions | Optional Hive publication | MEDALS stakes/payouts via Hive Engine escrow | Full prediction state, escrow ledger |
| Contests (generic) | — | MEDALS entry fees/payouts via Hive Engine | Full contest state, escrow ledger |
| IPL Boundary BlackJack | — | MEDALS prizes (manual) | Full competition state |
| Last Man Standing | — | MEDALS prizes (manual) | Full competition state |

**Escrow account:** `sp-predictions` (shared by predictions and contests). All transactions tracked in escrow ledger tables.

### Match Threads (Live Match Discussions)

Live match discussion threads powered by ESPN API data + Sportsbites posted to Hive containers. Supports multiple sports.

**Data flow:** ESPN API → match data fetched → Hive container created for each match → users post sportsbites linked to `matchThreadId` → real-time updates via polling.

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/hive-workerbee/match-threads.ts` | Container creation, permlink generation |
| `src/lib/hive-workerbee/match-threads-server.ts` | Server-side match thread operations |
| `src/lib/sports/espn.ts` | ESPN API integration for live match data |
| `src/components/match-threads/MatchThreadFeed.tsx` | Feed of match threads with live status |
| `src/components/match-threads/MatchThreadHeader.tsx` | Match info and stats header |
| `src/components/match-threads/MatchDetailTabs.tsx` | Tabs: details, lineups, events, timeline |
| `src/components/match-threads/MatchEventsTimeline.tsx` | Goal timeline, major events |
| `src/components/match-threads/MatchLineups.tsx` | Team lineups and formation |
| `src/components/match-threads/MatchStatsPanel.tsx` | Team stats (shots, possession) |
| `src/components/initializers/MatchThreadLiveNotifier.tsx` | Real-time live event notifications |

**API routes:** `/api/match-threads` (GET — live, upcoming 48h, recently finished 24h), `/api/match-threads/[eventId]` (GET details), `/api/match-threads/[eventId]/details` (GET lineups, stats, timeline), `/api/match-threads/[eventId]/bites` (GET sportsbites), `/api/match-threads/[eventId]/ensure` (POST create Hive container).

**Cron:** `/api/cron/match-thread-containers` — ensures containers exist for upcoming/live matches.

### Long-Form Content (New & Discover)

Full blog/article posts with markdown editor, drafts, scheduled publishing, and cover images. Published to Hive blockchain in `hive-115814` community.

**Pages:** `/new` (post creation/editor), `/discover` (content feed — trending + latest).

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/hive-workerbee/posting.ts` | Build Hive posting operations |
| `src/lib/hive-workerbee/posting-server.ts` | Server-side posting logic (RC delegation, checks) |
| `src/lib/hive-workerbee/content.ts` | Fetch posts, trending content |
| `src/lib/shared/types.ts` | `SportsblockPost` type definition |
| `src/hooks/useEditorActions.ts` | Editor actions (insert, format) |
| `src/hooks/usePublishForm.ts` | Form state (title, content, tags) |
| `src/hooks/usePublishActions.ts` | Publishing logic (sign, broadcast) |
| `src/components/publish/PublishEditorPanel.tsx` | Main markdown editor layout |
| `src/components/publish/EditorToolbar.tsx` | Formatting toolbar (bold, italic, links, images, code) |
| `src/components/publish/CoverImageUpload.tsx` | Featured image upload |
| `src/components/publish/MarkdownPreview.tsx` | Live preview |
| `src/components/publish/TagInput.tsx` | Sport category and tags |
| `src/components/publish/DraftsDrawer.tsx` | Load/manage drafts |
| `src/components/publish/ScheduleModal.tsx` | Schedule post for future publication |
| `src/app/new/page.tsx` | Post creation page |
| `src/app/discover/page.tsx` | Discovery feed (server-rendered trending + client infinite scroll) |

**API routes:** `/api/hive/posts` (GET — filter by user, trending, sport, tag; cached 60s), `/api/hive/posting` (GET — check RC limits).

**DB models:** `Post` (soft posts), `Draft`, `ScheduledPost`.

**Cron:** `/api/cron/publish-scheduled-posts` — publishes scheduled posts at their due time.

### Hive Wallet

Wallet dashboard showing HIVE, HBD, and MEDALS balances with transfer, staking, delegation, and swap capabilities. Crypto prices displayed for BTC, ETH, HIVE, HBD.

**Page:** `/wallet`

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/hive-engine/client.ts` | MEDALS token client, balance queries |
| `src/lib/hive-engine/operations.ts` | Build transfer, stake, delegation operations |
| `src/lib/hive-engine/tokens.ts` | Token balance lookups |
| `src/lib/hive-engine/constants.ts` | MEDALS config, token constants |
| `src/lib/hive/broadcast-client.ts` | Unified broadcasting (Keychain, HiveSigner, signing relay) |
| `src/hooks/useBroadcast.ts` | Broadcast transactions (handles auth type switching) |
| `src/components/wallet/HiveBalanceCard.tsx` | HIVE balance display |
| `src/components/wallet/HBDBalanceCard.tsx` | HBD balance display |
| `src/components/wallet/MedalsTokenSection.tsx` | MEDALS balance and actions |
| `src/components/wallet/TransactionHistory.tsx` | Transaction history table |
| `src/components/wallet/CryptoPricesGrid.tsx` | BTC, ETH, HIVE, HBD prices |
| `src/components/wallet/ClaimRewardsBanner.tsx` | Claim pending rewards |
| `src/components/wallet/PowerPanel.tsx` | HIVE Power / VP info |
| `src/components/medals/TransferModal.tsx` | MEDALS transfer modal |
| `src/components/medals/SwapModal.tsx` | MEDALS swap modal |

**API routes (Hive native):** `/api/hive/account/summary` (GET balances), `/api/hive/account/history` (GET transactions), `/api/hive/power` (GET VP/delegation), `/api/hive/claim-rewards` (POST), `/api/hive/delegate` (POST).

**API routes (Hive Engine / MEDALS):** `/api/hive-engine/balance` (GET), `/api/hive-engine/batch-balance` (GET), `/api/hive-engine/transfer` (POST), `/api/hive-engine/stake` (POST), `/api/hive-engine/swap` (POST), `/api/hive-engine/history` (GET), `/api/hive-engine/leaderboard` (GET), `/api/hive-engine/market` (GET), `/api/hive-engine/open-orders` (GET).

**Cron:** `/api/cron/staking-rewards` — distributes MEDALS staking rewards.

### Dashboard & Leaderboards

User dashboard with lifetime stats, weekly/monthly leaderboards, and public user profiles.

**Pages:** `/dashboard` (user stats, leaderboards, weekly winners), `/user/[username]` (public profile — SSR with JSON-LD structured data).

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/hive-workerbee/account.ts` | Fetch user account data and profile |
| `src/lib/react-query/queries/useLeaderboard.ts` | Query weekly leaderboards |
| `src/components/leaderboard/MyRankCard.tsx` | User's rank card (score, tier badge) |
| `src/components/leaderboard/LeaderboardGrid.tsx` | Grid of leaderboard categories |
| `src/components/leaderboard/WeeklyWinners.tsx` | Weekly winners display |
| `src/components/leaderboard/WeeklyRewardsSummary.tsx` | Weekly rewards breakdown |
| `src/components/widgets/PotentialEarningsWidget.tsx` | Estimated earnings widget |

**API routes:** `/api/user-stats` (GET — lifetime + prediction win rate), `/api/leaderboard/all-time` (GET), `/api/leaderboard/monthly` (GET), `/api/leaderboard/my-rank` (GET).

**DB models:** `UserStats`, `UserSportStats`, `UserMetric`, `Leaderboard`, `MonthlyLeaderboard`, `MonthlyTitle`.

**Crons:** `/api/cron/update-analytics` (weekly metrics), `/api/cron/weekly-rewards` (calculate rewards + MEDALS scores), `/api/cron/monthly-leaderboard` (monthly snapshots), `/api/cron/hourly-leaderboard` (hourly updates).

### Badges (50+ Achievement Badges)

Achievement system with 50+ badges across 6 categories: content, engagement, predictions, streaks, milestones, and monthly titles. Badges evaluated inline (fire-and-forget after actions) and via weekly cron sweep.

**Categories:** Content (First Post, 10/50/100 Posts, First Bite, 100/500 Bites), Engagement (First Comment, 1K Comments, 10K Views, First Tip), Predictions (Expert 60%+, Sharpshooter 80%+, The Oracle 10-streak, Epic Caller 5 correct scorelines), Streaks (3/10/52-week posting streaks), Milestones (1M views, 10K tips), Monthly (sport-specific monthly titles).

**Key files:**
| File | Purpose |
|------|---------|
| `src/lib/badges/catalogue.ts` | `BADGE_CATALOGUE[]` (all 50+ badges), `RANK_TIERS` (6 ranks) |
| `src/lib/badges/types.ts` | Badge types and interfaces |
| `src/lib/badges/evaluator.ts` | `evaluateBadgesForAction()` (inline), `evaluateAllBadges()` (cron) |
| `src/lib/badges/calculator.ts` | MEDALS scores and rank tier assignments |
| `src/lib/badges/monthly-titles.ts` | Monthly title calculation and award |

**API route:** `/api/badges` (GET — returns badges, rank, sport ranks, monthly titles; cached 300s).

**Triggers:** `post_created`, `sportsbite_created`, `comment_created`, `prediction_settled`, `streak_updated`.

**DB models:** `UserBadge`, `UserStats` (metrics that trigger badges).

**Cron:** `/api/cron/check-graduations` — weekly badge sweep for all active users.

### Roles & Ranks (6-Tier System)

MEDALS score-based ranking system with 6 tiers. Score calculated weekly from posts, comments, tips, prediction win rate, and community engagement. Normalized to 0–100.

| Rank | Label | Score Range | Badge Colour |
|------|-------|-------------|-------------|
| `hall-of-fame` | Hall of Fame | 91–100 | Gold (yellow-400 → amber-500) |
| `legend` | Legend | 76–90 | Purple (purple-500 → violet-500) |
| `pundit` | Pundit | 56–75 | Green (emerald-500 → green-600) |
| `analyst` | Analyst | 36–55 | Teal (cyan-500 → teal-500) |
| `contender` | Contender | 16–35 | Blue (blue-500 → sky-500) |
| `rookie` | Rookie | 0–15 | Grey (slate-400 → gray-500) |

**Rank lookup:** `getRankTierForScore(score)` in `src/lib/badges/catalogue.ts`. Ranks returned by `/api/badges` and `/api/user-stats`. Sport-specific ranks calculated per sport via `UserSportStats`.

**Monthly titles:** Best performing user per sport per month, stored in `MonthlyTitle` table, awarded via `/api/cron/monthly-leaderboard`.

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
