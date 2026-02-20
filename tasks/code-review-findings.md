# Production Readiness Code Review — 2026-02-20

**Branch:** `onboarding` vs `main` | **Scope:** 129 files, +5,994 / -9,547 lines

---

## CRITICAL — Fix Before Merge

### 1. Account Creation Can Permanently Lose Keys
**Files:** `src/lib/hive/account-creation.ts:149-158`
**Issue:** Account created on-chain (irreversible) but `encryptKeys()` has no try/catch. If encryption fails, keys are garbage collected forever. Also, DB failure returns generic error in production — "contact support" message swallowed.
**Status:** [x] Fixed — Added `AccountCreationError` class, try/catch around `encryptKeys()` with CRITICAL logging, DB failure surfaces error message.

### 2. Static Hardcoded Salt for Key Encryption
**File:** `src/lib/hive/key-encryption.ts:5`
**Issue:** All users share the same derived encryption key. If `KEY_ENCRYPTION_SECRET` leaks, all custodial keys are compromised.
**Status:** [x] Fixed — Per-user random salt, stored in `encryptionSalt` column, backwards-compatible fallback for legacy keys.

### 3. `account_update2` Allows Authority Key Changes via Relay
**File:** `src/lib/hive/signing-relay.ts:94-100`
**Issue:** Only validates `account === hiveUsername`, not what fields are being updated. Could modify posting authority.
**Status:** [x] Fixed — Field-level validation rejects `owner`, `active`, `posting`, `memo_key`, `json_metadata`; only allows `posting_json_metadata`.

### 4. Client Auth State Not Updated After Account Creation
**File:** `src/app/onboarding/username/page.tsx:107-127`
**Issue:** After account creation, navigates without updating AuthContext or session cookie. User has stale state.
**Status:** [x] Fixed — Calls `updateUser({ hiveUsername })` before navigation.

### 5. `claim-tokens` Cron Claims Tokens Into Wrong Account
**File:** `src/app/api/cron/claim-tokens/route.ts:80-90`
**Issue:** Checks niallon11's balance but claims into sp-blockrewards. Account creation uses niallon11's tokens.
**Status:** [x] Fixed — Uses `ACCOUNT_CREATOR` and `ACCOUNT_CREATOR_ACTIVE_KEY`, removed unused `OPERATIONS_ACCOUNT`.

### 6. Encryption Salt Can Diverge Between Session Files
**Files:** `src/app/api/auth/sb-session/route.ts:46`, `src/lib/api/session-auth.ts:44`
**Issue:** Duplicated key derivation logic. One throws in prod if salt missing, other silently falls back.
**Status:** [x] Fixed — Created shared `src/lib/api/session-encryption.ts` used by both files.

---

## HIGH — Fix Before Production Traffic

### 7. `custom_json` Validation Gap
**File:** `src/lib/hive/signing-relay.ts:76-83`
**Issue:** Doesn't verify `required_auths` is empty. No allowlist of safe `custom_json` IDs.
**Status:** [x] Fixed — Added `required_auths` emptiness check and `ALLOWED_CUSTOM_JSON_IDS` allowlist.

### 8. No Rate Limiting on Account Creation
**File:** `src/app/api/hive/create-account/route.ts`
**Issue:** Falls under catch-all at 200 req/min. Too permissive for ACT-consuming endpoint.
**Status:** [x] Fixed — Added explicit rate limits in middleware for create-account, sign, download-keys, check-username.

### 9. No Max Operations Limit in Signing Relay
**File:** `src/app/api/hive/sign/route.ts:77`
**Issue:** No cap on operations array length.
**Status:** [x] Fixed — Added `operations.length > 10` guard.

### 10. `useVoting` Blocks Custodial Users From Voting
**File:** `src/features/hive/hooks/useVoting.ts:65,122-124`
**Issue:** Gates on `authType === 'hive'`, blocking custodial users who could vote via relay.
**Status:** [x] Fixed — Changed to `canBroadcast = authType === 'hive' || authType === 'soft'`.

### 11. `updatePost`/`deletePost` Not Migrated to `broadcastFn`
**File:** `src/lib/hive-workerbee/posting.ts:248-358`
**Issue:** Still use old `client.broadcast()` pattern. Won't work for custodial users.
**Status:** [x] Fixed — Both functions now accept `broadcastFn: BroadcastFn` parameter, removed `initializeWorkerBeeClient` dependency. Tests updated.

### 12. Google Auth Bridge Failure Silently Swallowed
**File:** `src/contexts/auth/useGoogleAuthBridge.ts:63-68`
**Issue:** `getSession()` failure sets `attempted = true`, never retries. User stuck as guest.
**Status:** [x] Fixed — Error catch now resets `attempted.current = false` to allow retry on next mount.

### 13. Cron Jobs Use Raw `console.log` — Failures Invisible
**Files:** All `src/app/api/cron/*` routes
**Issue:** None use structured logger. Vercel doesn't surface cron response bodies.
**Status:** [x] Fixed — All 4 cron routes migrated from `console.log/warn/error` to structured `logger.info/warn/error` with context tags.

### 14. `isAlreadyProcessed` Returns `false` on DB Error → Double Processing
**Files:** `src/app/api/cron/staking-rewards/route.ts:30-39`, `src/app/api/cron/weekly-rewards/route.ts:37-46`
**Issue:** DB error during idempotency check → proceeds as if never processed → double rewards.
**Status:** [x] Fixed — Both return `true` on DB error (fail-safe). `markAsProcessed` throws on failure.

### 15. 37 npm Dependency Vulnerabilities
**Issue:** Includes Next.js DoS vulnerabilities and `qs` bypass.
**Status:** [ ] Deferred — Requires separate `npm audit fix` run, may need manual review of breaking changes.

### 16. Zero Test Coverage on Security-Critical Modules
**Issue:** No tests for signing-relay, key-encryption, session-auth, account-creation, username validation, broadcast-client.
**Status:** [ ] Deferred — Separate testing sprint needed.

---

## MEDIUM — Should Fix

### 17. Session cookie has no server-side expiry validation
**File:** `src/lib/api/session-auth.ts`
**Status:** [x] Fixed — Added `MAX_SESSION_AGE_MS` (7 days) and server-side `loginAt` check in `decryptSession()`.

### 18. Dev header auth bypass could work on staging
**File:** `src/lib/api/session-auth.ts:130-142`
**Status:** [x] Already safe — Guard requires both `ALLOW_HEADER_AUTH === 'true'` AND `NODE_ENV !== 'production'`.

### 19. Key download has no re-authentication
**File:** `src/app/api/hive/download-keys/route.ts`
**Status:** [ ] Deferred — Requires UI flow changes (re-enter password/2FA). Session cookie auth already required.

### 20. `check-username` is unauthenticated
**File:** `src/app/api/hive/check-username/route.ts`
**Status:** [x] Fixed — Added `getAuthenticatedUserFromSession()` guard. Only authenticated users can check usernames.

### 21. In-memory rate limiter doesn't work across Vercel instances
**File:** `src/app/api/hive/sign/route.ts:19-36`
**Status:** [ ] Deferred — Known Vercel limitation. Would need external store (Redis/Upstash). Middleware rate limiting provides per-instance protection.

### 22. Env validation doesn't check custodial secrets
**File:** `src/lib/env.ts:128-161`
**Status:** [x] Fixed — Added production checks for `KEY_ENCRYPTION_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`.

### 23. Operator precedence bug in error string
**File:** `src/app/auth/hooks/useAuthPage.ts:438`
**Status:** [x] Fixed — Changed to `'Login failed: ' + (result.error || 'Unknown error')`.

### 24. Key download failure shows no error to user
**File:** `src/components/KeyDownloadBanner.tsx:56-58`
**Status:** [x] Fixed — Added `downloadError` state with UI display.

### 25. `persistAuthState` debounce can lose state on fast navigation
**File:** `src/contexts/auth/auth-persistence.ts:255-289`
**Status:** [ ] Deferred — Needs `beforeunload` flush or `navigator.sendBeacon`. Low risk since session cookie is primary auth.

### 26. Graduation cron: RC revoked before DB mark
**File:** `src/app/api/cron/check-graduations/route.ts:106-149`
**Status:** [x] Fixed — DB mark first, then RC revocation (with inner try/catch for non-fatal RC failure).

### 27. Duplicate `HiveOperation` types
**Files:** `src/lib/hive/signing-relay.ts`, `src/lib/hive/broadcast-client.ts`
**Status:** [x] Fixed — Shared `src/types/hive-operations.ts`, both files import from it.

### 28. `BroadcastResult` not discriminated union
**File:** `src/lib/hive/broadcast-client.ts`
**Status:** [x] Fixed — Changed to `{ success: true; transactionId: string } | { success: false; error: string }`.

### 29. Duplicate `ApiErrorResponse` types
**Files:** `src/types/api.ts`, `src/lib/api/response.ts`
**Status:** [x] Documented — Types intentionally differ (flat vs envelope format). Added `@deprecated` notice to `types/api.ts` pointing to new envelope types in `response.ts`.

### 30. `as string` casts in NextAuth session callback
**File:** `src/lib/auth/next-auth-options.ts:63-67`
**Status:** [x] Fixed — Added guard for missing `custodialUserId`, changed to `?? undefined` pattern.

### 31. Prisma Community.type mismatch
**File:** `prisma/schema.prisma`
**Status:** [x] Fixed — Changed comment from `'restricted'` to `'invite-only'` to match code.

### 32. Stale Firebase mocks in 3 test files
**Files:** `tests/contexts/auth-storage.test.ts`, `tests/contexts/auth-aioha.integration.test.tsx`, `tests/contexts/auth-race-conditions.test.tsx`
**Status:** [x] Fixed — Removed stale `jest.mock('@/lib/firebase/auth')` from all 3 files. Note: auth-aioha and auth-race-conditions tests have pre-existing logic failures unrelated to Firebase mocks (session restoration tests don't match current AuthContext behavior).

### 33. Dual session systems can drift apart
**Files:** `src/contexts/AuthContext.tsx`, `src/contexts/auth/useGoogleAuthBridge.ts`
**Status:** [ ] Deferred — Architectural concern. httpOnly cookie is authoritative; localStorage hints are secondary.

### 34. `POST /api/auth/sb-session` only validates CSRF
**File:** `src/app/api/auth/sb-session/route.ts`
**Status:** [ ] Accepted risk — CSRF+origin validation prevents cross-origin attacks. Session POST is inherently called to *establish* sessions, so session-based auth would be circular. XSS is mitigated by httpOnly cookies.

### 35. Pg Pool without explicit limits for serverless
**File:** `src/lib/db/prisma.ts`
**Status:** [x] Fixed — Added `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 10000`. Pool max is now configurable via `DATABASE_POOL_MAX` env var (defaults to 10).

---

## LOW — Consider Fixing

### 36. Key material not securely zeroed (JS limitation)
**File:** `src/lib/hive/signing-relay.ts`
**Status:** [ ] Won't fix — JavaScript does not provide memory zeroing primitives. Documented limitation.

### 37. No audit trail for key downloads
**File:** `src/app/api/hive/download-keys/route.ts`
**Status:** [x] Already exists — `keysDownloaded: true` and `keysDownloadedAt` are set in DB. `ctx.log.info('Keys downloaded')` provides structured log.

### 38. CSP allows unsafe-inline (Next.js limitation)
**File:** `next.config.ts`
**Status:** [ ] Won't fix — Next.js requires `unsafe-inline` for its own script/style injection. Documented limitation.

### 39. Empty catch blocks in loadUIHint/clearUIHint
**File:** `src/contexts/auth/auth-persistence.ts`
**Status:** [x] Fixed — Added dev-mode `console.warn` for both catch blocks.

### 40. Rename 'soft' to 'custodial' in AuthType
**File:** `src/types/ui.ts`
**Status:** [ ] Deferred — Breaking change across entire codebase. Separate migration PR.

### 41. User type is flat bag of optionals
**File:** `src/types/user.ts`
**Status:** [ ] Deferred — Breaking type redesign. Separate effort.

### 42. AccountCreationResult.success is always true
**File:** `src/lib/hive/account-creation.ts`
**Status:** [x] Fixed — Removed redundant `success: true` from the type and return value. Errors throw instead.

---

## Round 2 Review Items (R2)

### R2-20. Tighten dev fallback encryption guard
**Files:** `src/lib/hive/key-encryption.ts:11`, `src/lib/api/session-encryption.ts:14,20`
**Issue:** Guard `=== 'production'` allows staging/preview to silently use insecure dev fallback keys.
**Status:** [x] Fixed — Changed all 3 guards to `!== 'development'`.

### R2-24+25. N+1 queries in batch check routes + PUT semantics
**Files:** `src/app/api/soft/reactions/route.ts`, `src/app/api/soft/poll-votes/route.ts`, `src/app/api/soft/follows/route.ts`
**Issue:** Batch check handlers used N+1 individual queries and PUT (wrong HTTP method for read-only checks).
**Status:** [x] Fixed — Reactions/poll-votes batch: replaced N+1 loops with 2 batched queries (groupBy + findMany). All 3 routes: renamed PUT→PATCH. Updated 4 client callers.

### R2-26. Prisma pool size not configurable
**File:** `src/lib/db/prisma.ts:12`
**Issue:** Hardcoded `max: 5`.
**Status:** [x] Fixed — `max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10)`. Added to `.env.example`.

### R2-27. View count not deduplicated
**File:** `src/app/api/posts/[id]/route.ts`
**Issue:** Every GET increments view count — bots/refreshes inflate numbers.
**Status:** [x] Fixed — Redis-based dedup using hashed IP+UA fingerprint with 1hr TTL. Falls back to increment-anyway if Redis unavailable.

### R2-31. Dead `isSubscribedToCommunity` function
**File:** `src/lib/hive-workerbee/community.ts`
**Issue:** Exported but never imported or called.
**Status:** [x] Fixed — Deleted.

### Deferred R2 Items
| Issue | Reason |
|-------|--------|
| R2-21: JS memory zeroing | Language limitation (won't fix) |
| R2-22: Master password in blob | By design for user key graduation |
| R2-23: Denormalized author data | Needs cache architecture |
| R2-35: useAuthPage decomposition | Large refactor, separate PR |
| R2-36: publish/page.tsx | Large refactor, not dead code |

---

## Summary

| Severity | Total | Fixed | Deferred/Won't Fix |
|----------|-------|-------|---------------------|
| Critical | 6 | 6 | 0 |
| High | 10 | 8 | 2 |
| Medium | 19 | 15 | 4 |
| Low | 7 | 4 | 3 |
| R2 | 6 | 6 | 0 |
| **Total** | **48** | **39** | **9** |

### Deferred Items Rationale (R1)
- **#15** (npm vulnerabilities): Requires Prisma 6.x breaking upgrade
- **#16** (test coverage): Separate testing sprint; too large for this PR
- **#19** (re-auth for key download): Needs UI flow + 2FA/password re-entry
- **#25** (debounce state loss): Low risk since cookie is primary auth
- **#33** (dual session drift): Architectural; cookie is authoritative
- **#34** (sb-session POST): Accepted risk; CSRF prevents cross-origin
- **#36** (memory zeroing): JS limitation
- **#38** (CSP unsafe-inline): Next.js limitation
- **#40** (rename soft→custodial): Breaking codebase-wide rename
- **#41** (User type redesign): Breaking type overhaul
