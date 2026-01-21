# Sportsblock

A Next.js 15 sports content platform integrated with the Hive blockchain. Users can authenticate via Hive wallets or Firebase email, then read and publish sports-related posts to the Hive blockchain.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Blockchain**: Hive (via WorkerBee/Wax)
- **Auth**: Aioha (Hive wallets) + Firebase
- **Testing**: Jest + Playwright
- **Error Tracking**: Sentry

## Prerequisites

- Node.js 18+
- npm or yarn
- A Hive account (for publishing)

## Getting Started

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
   Edit `.env.local` with your configuration values.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Scripts

| Command | Description |
| --------- | ------------- |
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
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
│   │   ├── hive-engine/  # Token operations
│   │   └── auth/         # Authentication
│   ├── feed/             # Main feed page
│   ├── profile/          # User profile
│   ├── publish/          # Post creation
│   └── ...
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   ├── auth/             # Auth components
│   └── ...
├── contexts/              # React Context providers
├── stores/                # Zustand state stores
├── lib/                   # Utility libraries
│   ├── hive-workerbee/   # Hive blockchain integration
│   ├── react-query/      # Server state queries
│   └── firebase/         # Firebase integration
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types

tests/                     # Jest tests
e2e/                       # Playwright E2E tests
scripts/                   # Development utilities
docs/                      # Documentation
```

## Documentation

Additional documentation is available in the `docs/` directory:

- **[docs/setup/](docs/setup/)** - Firebase and analytics setup guides
- **[docs/architecture/](docs/architecture/)** - Technical architecture decisions
- **[docs/features/](docs/features/)** - Feature implementation details
- **[docs/operations/](docs/operations/)** - Operational guides

See [CLAUDE.md](CLAUDE.md) for AI assistant context and development patterns.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `UPSTASH_REDIS_*` - Rate limiting (optional)

## Architecture Notes

- **Server/Client Boundary**: WorkerBee and Wax (Hive WASM libraries) run server-side only. Client components must use API routes at `/api/hive/*`.
- **Authentication**: Two auth paths - Hive wallets (full blockchain access) and Firebase email (read-only, upgradeable).
- **State Management**: Zustand for UI state, React Query for server state, Contexts for providers.

## License

Private
