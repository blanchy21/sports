# Sportsblock

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Private-red)](#license)

A Next.js 15 sports content platform integrated with the Hive blockchain. Users can authenticate via Hive wallets for full blockchain access, or use Firebase email for a streamlined experience with an optional upgrade path.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)
- [License](#license)

## Features

- **Dual Authentication** - Hive blockchain wallets or email/password signup
- **Unified Feed** - Content from both Hive and Firebase displayed together
- **Blockchain Publishing** - Posts permanently stored on Hive blockchain
- **Cryptocurrency Rewards** - Hive users earn HIVE/HBD for quality content
- **Community System** - Create and join sports communities
- **Real-time Updates** - Live feed updates via blockchain streaming
- **Dark/Light Mode** - Full theme support
- **Mobile Responsive** - Optimized for all device sizes
- **Rich Text Editor** - Markdown support with image uploads
- **Notifications** - Real-time alerts for votes, comments, and follows

## Tech Stack

| Category | Technology |
| -------- | ---------- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Blockchain | Hive (WorkerBee/Wax) |
| Auth | Aioha (Hive) + Firebase |
| Database | Firebase Firestore |
| Testing | Jest + Playwright |
| Monitoring | Sentry |

## Authentication

Sportsblock supports two authentication methods:

### Hive Users (Full Access)

- Authenticate via Hive wallets (Keychain, HiveSigner, HiveAuth, Ledger, PeakVault)
- Posts published directly to the Hive blockchain
- Earn cryptocurrency rewards (HIVE, HBD) for content
- Vote on posts with blockchain voting power
- Full decentralized experience

### Soft Users (Firebase/Email)

- Quick signup with email and password
- Posts stored in Firebase ("soft posts")
- Like and comment on soft posts
- Posts appear in the unified feed alongside Hive content
- **Upgrade path**: Connect a Hive wallet anytime to unlock blockchain features

### Feature Comparison

| Feature | Hive Users | Soft Users |
| ------- | ---------- | ---------- |
| Create posts | Blockchain | Firebase |
| Vote/Like | Blockchain voting | Soft likes |
| Comments | Blockchain | Firebase |
| Earn rewards | Yes (HIVE/HBD) | No |
| Post limit | Unlimited | 50 posts |
| Data permanence | Permanent | 180-day inactivity policy |
| Upgrade available | N/A | Yes |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (for soft auth)
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

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

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
│   │   ├── hive/         # Hive blockchain endpoints
│   │   ├── soft/         # Soft user endpoints
│   │   ├── unified/      # Merged Hive + Firebase endpoints
│   │   └── ...
│   ├── feed/             # Main feed page
│   ├── profile/          # User profile
│   ├── publish/          # Post creation
│   └── ...
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   ├── modals/           # Modal components
│   └── ...
├── contexts/              # React Context providers
├── stores/                # Zustand state stores
├── lib/                   # Utility libraries
│   ├── hive-workerbee/   # Hive blockchain integration
│   ├── firebase/         # Firebase integration
│   └── react-query/      # Server state queries
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types

tests/                     # Jest tests
e2e/                       # Playwright E2E tests
scripts/                   # Development utilities
docs/                      # Documentation
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

### Required

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK JSON (server-side) |

### Optional

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret for cron job authentication |
| `TENOR_API_KEY` | Tenor API key (GIF picker) |

## Architecture

### Server/Client Boundary

WorkerBee and Wax (Hive WASM libraries) run server-side only. Client components must use API routes at `/api/hive/*`.

### Dual Authentication System

```text
┌─────────────────────────────────────────────────────────┐
│                      AuthContext                         │
├─────────────────────────┬───────────────────────────────┤
│     AiohaProvider       │       FirebaseAuth            │
│   (Hive Wallets)        │     (Email/Password)          │
├─────────────────────────┴───────────────────────────────┤
│                    Unified User Object                   │
└─────────────────────────────────────────────────────────┘
```

- **Hive Auth** (`AiohaProvider`): Wallet-based authentication for blockchain operations
- **Soft Auth** (`FirebaseAuth`): Email/password authentication stored in Firebase
- **Unified AuthContext**: Merges both auth states, provides consistent user object

### Data Storage

| Data Type | Hive Users | Soft Users |
| --------- | ---------- | ---------- |
| Posts | Hive Blockchain | Firebase `soft_posts` |
| Comments | Hive Blockchain | Firebase `soft_comments` |
| Votes/Likes | Hive Blockchain | Firebase `soft_likes` |
| Profiles | Hive Blockchain | Firebase `profiles` |
| Notifications | N/A | Firebase `soft_notifications` |

### Unified Feed

The `/api/unified/posts` endpoint merges content from both sources:

1. Hive posts fetched via WorkerBee
2. Soft posts fetched via Firebase Admin SDK
3. Combined, deduplicated, and sorted by creation date

### State Management

- **Zustand**: UI state (modals, bookmarks, communities)
- **React Query**: Server state with caching and revalidation
- **Contexts**: Auth, theme, notifications, price data

## Documentation

Additional documentation is available in the `docs/` directory:

- **[docs/setup/](docs/setup/)** - Firebase and analytics setup guides
- **[docs/architecture/](docs/architecture/)** - Technical architecture decisions
- **[docs/features/](docs/features/)** - Feature implementation details
- **[docs/operations/](docs/operations/)** - Operational guides

See [CLAUDE.md](CLAUDE.md) for AI assistant context and development patterns.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Run `npm run lint` before committing
- Write tests for new features
- Update documentation as needed

## Acknowledgments

- [Hive Blockchain](https://hive.io/) - Decentralized social blockchain
- [Aioha](https://github.com/aioha-hive/aioha) - Hive authentication library
- [WorkerBee](https://gitlab.syncad.com/hive/workerbee) - Hive blockchain client
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Firebase](https://firebase.google.com/) - Backend services

## License

Private - All rights reserved.
