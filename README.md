# Sportsblock

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Private-red)](#license)

A Next.js 15 sports content platform integrated with the Hive blockchain. Users can authenticate via Hive wallets for full self-custody, or sign up with Google for a streamlined custodial experience with an upgrade path to full blockchain access.

**Production:** [https://sportsblock.app](https://sportsblock.app)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)
- [License](#license)

## Features

- **Dual Authentication** - Hive blockchain wallets or Google OAuth with custodial onboarding
- **Blockchain Publishing** - Posts permanently stored on the Hive blockchain
- **Cryptocurrency Rewards** - Earn HIVE/HBD for quality content
- **SportsBites** - Short-form sports content (think tweets for sports)
- **Match Threads** - Live discussion threads tied to real sports events
- **Hive Engine Integration** - Token balances, staking, transfers, and market data
- **Wallet** - View and manage HIVE, HBD, and Hive Engine tokens
- **Leaderboard** - Community engagement rankings and medals
- **Community System** - Browse and join sports communities
- **Real-time Updates** - Live feed updates via blockchain streaming
- **Dark/Light Mode** - Full theme support
- **Mobile Responsive** - Optimized for all device sizes
- **Rich Text Editor** - Markdown support with image uploads and GIF picker

## Tech Stack

| Category | Technology |
| -------- | ---------- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Blockchain | Hive (WorkerBee / Wax / dhive) |
| Auth | Aioha (Hive wallets) + NextAuth (Google OAuth) |
| Database | PostgreSQL (Supabase) via Prisma |
| Rate Limiting | Upstash Redis |
| Animation | Framer Motion |
| Testing | Jest + Playwright |
| Monitoring | Sentry |
| Deployment | Vercel |

## Authentication

Sportsblock supports two authentication methods that converge in a unified `AuthContext`:

### Hive Users (Full Self-Custody)

- Authenticate via Hive wallets (Keychain, HiveSigner, HiveAuth, Ledger, PeakVault)
- Posts published directly to the Hive blockchain
- Earn cryptocurrency rewards (HIVE, HBD) for content
- Vote on posts with blockchain voting power
- Full decentralized experience

### Google OAuth Users (Custodial)

- Sign in with Google via NextAuth
- A real Hive account is created server-side (`sb-` prefixed username)
- Keys encrypted and stored in PostgreSQL; signing relay handles blockchain ops
- Posts go directly to the Hive blockchain (same as native Hive users)
- **Graduation path**: Download keys anytime for full self-custody

### Custodial Onboarding Flow

1. Sign in with Google -> NextAuth session created -> user stored in PostgreSQL via Prisma
2. Redirect to `/onboarding/username` -> user picks a Hive username (`sb-` prefix)
3. Server calls `create_claimed_account` using account creation tokens
4. Keys encrypted + stored server-side -> signing relay handles blockchain ops
5. User can download keys anytime (`/api/hive/download-keys`) for full self-custody

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL database (Supabase recommended)
- Upstash Redis (for rate limiting)
- Google OAuth credentials (for custodial auth)
- Hive account (optional - for blockchain features)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sports
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration values (see [Environment Variables](#environment-variables)).

4. **Generate Prisma client and run migrations**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start development server |
| `npm run dev:force` | Start with port cleanup script |
| `npm run build` | Generate Prisma client + production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run format` | Format code with Prettier |

### Testing

```bash
# Unit tests
npm run test
npm run test:unit:watch    # Watch mode

# API route tests
npm run test -- tests/api

# E2E tests (requires Playwright setup)
npx playwright install     # First time only
npm run test:e2e
npm run test:e2e:headed    # Interactive mode

# WorkerBee integration tests (requires network)
npm run test:workerbee:integration
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── hive/          # Hive blockchain endpoints
│   │   ├── hive-engine/   # Hive Engine token endpoints
│   │   ├── soft/          # Custodial user endpoints (Prisma)
│   │   ├── unified/       # Merged Hive + custodial endpoints
│   │   ├── auth/          # NextAuth + session endpoints
│   │   ├── match-threads/ # Live match thread endpoints
│   │   ├── cron/          # Scheduled task endpoints
│   │   └── ...
│   ├── feed/              # Main feed page
│   ├── sportsbites/       # Short-form content
│   ├── match-threads/     # Live match discussions
│   ├── wallet/            # Token management
│   ├── leaderboard/       # Rankings
│   ├── publish/           # Post creation
│   ├── onboarding/        # Custodial user onboarding
│   └── ...
├── components/             # React components
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   ├── posts/             # Post display components
│   ├── sportsbites/       # SportsBites components
│   ├── match-threads/     # Match thread components
│   ├── wallet/            # Wallet components
│   ├── voting/            # Voting components
│   ├── modals/            # Modal components
│   └── ...
├── contexts/               # React Context providers
├── stores/                 # Zustand state stores
├── lib/                    # Utility libraries
│   ├── hive-workerbee/    # Hive blockchain integration (server-only)
│   ├── hive/              # Hive account creation + signing relay
│   ├── hive-engine/       # Hive Engine token operations
│   ├── db/                # Prisma client
│   ├── auth/              # NextAuth configuration
│   ├── api/               # API helpers (CSRF, session auth, responses)
│   ├── react-query/       # Server state queries
│   ├── metrics/           # Engagement tracking
│   ├── rewards/           # Reward distribution logic
│   └── utils/             # Shared utilities
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript types

prisma/                     # Prisma schema + migrations
tests/                      # Jest tests
e2e/                        # Playwright E2E tests
scripts/                    # Development utilities
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

### Required

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXTAUTH_SECRET` | NextAuth session encryption secret |
| `NEXTAUTH_URL` | App URL (http://localhost:3000 for dev) |
| `SESSION_SECRET` | Session cookie encryption key (min 32 chars) |
| `KEY_ENCRYPTION_SECRET` | Secret for encrypting custodial Hive keys |

### Optional

| Variable | Description |
| -------- | ----------- |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN |
| `HIVE_NODE_URL` | Primary Hive node (default: api.hive.blog) |
| `CRON_SECRET` | Secret for cron job authentication |
| `THESPORTSDB_API_KEY` | TheSportsDB API key (match threads) |
| `ACCOUNT_CREATOR` | Hive account with creation tokens |
| `OPERATIONS_ACTIVE_KEY` | Active key for blockchain operations account |

See `.env.example` for the full list.

## Architecture

### Server/Client Boundary

WorkerBee and Wax (Hive WASM libraries) run **server-side only**. Client components must use API routes at `/api/hive/*`.

### Authentication System

```text
┌─────────────────────────────────────────────────────────┐
│                      AuthContext                         │
├─────────────────────────┬───────────────────────────────┤
│     AiohaProvider       │     NextAuth (Google)         │
│   (Hive Wallets)        │   + Custodial Signing Relay   │
├─────────────────────────┴───────────────────────────────┤
│                 Unified User Object                      │
│              useBroadcast() hook                         │
│          (routes to wallet or relay)                     │
└─────────────────────────────────────────────────────────┘
```

- **Hive Auth** (`AiohaProvider`): Wallet-based authentication for direct blockchain operations
- **Google Auth** (`NextAuth`): Google OAuth -> custodial Hive account -> signing relay
- **Unified AuthContext**: Merges both auth states, provides consistent user object
- **useBroadcast**: Abstraction that routes transactions to either the wallet or signing relay

### Data Storage

| Data Type | Storage |
| --------- | ------- |
| Posts (all users) | Hive Blockchain |
| Comments (Hive users) | Hive Blockchain |
| Comments (custodial users) | PostgreSQL (via Prisma) |
| Votes / Likes | Hive Blockchain or PostgreSQL |
| User accounts (custodial) | PostgreSQL |
| Encrypted keys | PostgreSQL |
| Notifications | PostgreSQL |
| Engagement metrics | PostgreSQL |

### State Management

- **Zustand**: UI state (modals, bookmarks, communities)
- **React Query**: Server state with caching and revalidation
- **Contexts**: Auth, theme, notifications, price data

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Run `npm run lint` and `npm run format` before committing
- Write tests for new features
- Update documentation as needed

## Acknowledgments

- [Hive Blockchain](https://hive.io/) - Decentralized social blockchain
- [Aioha](https://github.com/aioha-hive/aioha) - Hive authentication library
- [WorkerBee](https://gitlab.syncad.com/hive/workerbee) - Hive blockchain client
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Supabase](https://supabase.com/) - PostgreSQL hosting

## License

Private - All rights reserved.
