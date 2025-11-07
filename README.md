This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

- Unit tests (Jest + React Testing Library):
  ```bash
  npm run test
  npm run test:unit      # explicit alias
  npm run test:unit:watch
  ```

- API route integration (Jest + Supertest):
  ```bash
  npm run test -- tests/api
  ```

- WorkerBee integration suite (network required):
  ```bash
  npm run test:workerbee:integration
  # or run the existing CLI harness
  npm run test:workerbee
  ```

- Playwright end-to-end tests:
  ```bash
  npx playwright install  # first time only
  # Optional: provide a Hive username for auth-login e2e
  # PLAYWRIGHT_HIVE_USERNAME=blanchy npm run test:e2e
  npm run test:e2e
  npm run test:e2e:headed   # interactive run
  npm run test:e2e:debug    # step-through debugging
  ```
  Set `PLAYWRIGHT_SKIP_WEBSERVER=1` if you already have the dev server running.
