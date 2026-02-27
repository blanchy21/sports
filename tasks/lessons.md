# Lessons Learned

## Hive API: `condenser_api.get_following` has exclusive start parameter

**Date:** 2026-02-05
**Severity:** High — caused follow status checks to always return `false`

### Problem
`condenser_api.get_following` with params `[follower, start_following, type, limit]` treats `start_following` as **exclusive** — it returns entries *after* the specified name alphabetically. This means passing the exact target username as `start_following` with `limit=1` will never return the target itself.

Example: `get_following("blanchy", "niallon11", "blog", 1)` returns `niel96` (next alphabetically), not `niallon11`.

### Failed Fix Attempt
Truncating the last character of the username (e.g., `"niallon11"` -> `"niallon1"`) to start just before the target. This breaks when the truncated name isn't a valid Hive account — some nodes reject invalid account names with "Invalid parameters".

### Correct Fix
Use `bridge.get_relationship_between_accounts` instead:
```typescript
const result = await makeHiveApiCall('bridge', 'get_relationship_between_accounts', [follower, username]);
const isFollowing = result?.follows === true;
```
This is a direct, reliable check with no pagination quirks.

### Rule
**Never use `condenser_api.get_following` for single follow-status checks.** Always use `bridge.get_relationship_between_accounts` — it returns a clean `{ follows: boolean }` result.

---

## Hive API: ALL discussion queries enforce `limit <= 20`

**Date:** 2026-02-13 (updated — originally noted 2026-02-05 but fix was not applied)
**Severity:** Critical — broke trending topics, top authors, trending sports, and analytics entirely

### Problem
ALL Hive `get_discussions_by_*` methods (`get_discussions_by_created`, `get_discussions_by_trending`, `get_discussions_by_author_before_date`) enforce `limit` in range `[1:20]`. The analytics API and cron job passed limits of 50 and 500, causing "Invalid parameters" errors across all Hive nodes. Since this happened inside `Promise.all`, it took down all analytics at once.

### Fix
Added `HIVE_API_MAX_LIMIT = 20` constant and `fetchCreatedPaginated()` helper in `content.ts`. All discussion queries now automatically paginate in batches of 20 when callers request more. The cursor is **exclusive** — no duplicate skipping needed.

### Rule
**Never pass `limit > 20` to any Hive `get_discussions_by_*` API.** Use automatic pagination. The cursor (`start_author`/`start_permlink`) is exclusive — results start AFTER the cursor post.

---

## Avatar Component: `fallback` prop alone won't try Hive avatar URL

**Date:** 2026-02-05
**Severity:** Low — cosmetic

### Problem
The Avatar component's cascade logic (stage 0: `src`, stage 1: hive avatar, stage 2: dicebear) only tries the Hive avatar at stage 1 if a `src` prop was provided and failed. Passing only `fallback={username}` without `src` skips straight to DiceBear.

### Fix
Always pass `src={`https://images.hive.blog/u/${username}/avatar`}` alongside `fallback={username}` for Hive users.

### Rule
**For Hive user avatars, always pass both `src` (Hive avatar URL) and `fallback` (username) to the Avatar component.**

---

## Security: Admin endpoints must verify session, never trust client-supplied username

**Date:** 2026-02-06
**Severity:** Critical — allowed unauthenticated admin access

### Problem
Admin API endpoints (`/api/admin/metrics`, `/api/admin/curators`, `/api/admin/trigger-cron`) accepted `username` from query params or request body and checked `isAdminAccount(username)`. Any user could pass `username=sportsblock` to gain full admin access.

### Fix
Use `getAuthenticatedUserFromSession(request)` to get the username from the encrypted session cookie, then check `isAdminAccount(user.username)`.

### Rule
**Never trust client-supplied identity for authorization.** Always verify identity from the server-side session/cookie. Authorization checks must use the authenticated session, not request parameters.

---

## Security: WASM-free node config for Jest compatibility

**Date:** 2026-02-06
**Severity:** Medium — caused test failures

### Problem
Importing `HIVE_NODES` from `client.ts` (which imports `@hiveio/workerbee` WASM) broke Jest tests in `api.ts` because WASM can't run in jsdom.

### Fix
Created `nodes.ts` with zero dependencies for `HIVE_NODES`. All files import from `nodes.ts`. `client.ts` re-exports for backward compatibility.

### Rule
**Keep shared config/constants in dependency-free files.** Never co-locate simple constants with WASM or heavy imports.

---

## Hive: `comment` operation rejects empty body

**Date:** 2026-02-07
**Severity:** High — caused delete broadcast to fail via Keychain

### Problem
Broadcasting a `comment` operation with `body: ''` to "delete" a sportsbite was rejected by the blockchain/Keychain. The Hive `comment` operation requires a non-empty body.

### Fix
Use a two-step approach:
1. Try `delete_comment` operation first — simple (`{ author, permlink }`), works when no net votes or replies exist.
2. Fall back to `comment` operation with `body: '[deleted]'` (non-empty) when `delete_comment` fails.

### Rule
**Never broadcast a Hive `comment` operation with empty body.** Use `delete_comment` for true deletion, or `'[deleted]'` body as fallback for comments with votes/replies.

---

## setInterval without storing ID causes memory leaks

**Date:** 2026-02-07
**Severity:** High — intervals leak on stop/restart

### Problem
`RealtimeMonitor.scheduleAuthorCacheRefresh()` and `scheduleBlockTracking()` called `setInterval()` but discarded the return value. `stop()` only cleared subscriptions, not intervals.

### Rule
**Always store interval/timeout IDs and clear them on cleanup.** Any `setInterval` call must have a corresponding `clearInterval` in the cleanup/stop path.

---

## Concurrent async init requires promise dedup

**Date:** 2026-02-07
**Severity:** High — caused double `client.start()` calls

### Problem
`initializeWorkerBeeClient()` checked `client.running` then called `client.start()`. Two concurrent callers could both see `running === false` and both start the client.

### Rule
**Guard async singleton initialization with a shared promise.** Store the in-flight promise and return it to subsequent callers. Clear on error to allow retry.

---

## Every API endpoint that mutates data must have auth + CSRF

**Date:** 2026-02-08
**Severity:** Critical — found 3 endpoints missing auth entirely

### Problem
Multiple mutation endpoints (`/api/monitoring`, `/api/posts/[id]/like`, admin curators/trigger-cron) were either unauthenticated or missing CSRF protection. Easy to miss when new routes are added.

### Rule
**Every POST/PUT/DELETE route must have: (1) `getAuthenticatedUserFromSession` check, (2) `withCsrfProtection` wrapper.** No exceptions. Check both when reviewing new API routes.

---

## Hive vote weight accepts negative values for downvotes

**Date:** 2026-02-08
**Severity:** Critical — downvotes were completely broken

### Problem
`createVoteOperation` validated `weight < 0` as invalid, but `useVoting.downvote()` correctly passes negative weight. Every downvote silently failed.

### Rule
**Hive vote weight range is -100 to 100 (percentage), mapping to -10000 to 10000 basis points.** Always allow negative weights for downvotes.

---

## Trending sort must penalize age, not reward it

**Date:** 2026-02-08
**Severity:** Critical — trending feed showed stale content

### Problem
The formula `net_votes * Math.log(age)` rewards older posts because log(age) grows. Should use time-decay: `votes / pow(age + 2, 1.5)`.

### Rule
**Trending = engagement / time_decay.** Use HN-style gravity: `score / pow(hours + 2, 1.5)`.

---

## Never return `success: true` on error

**Date:** 2026-02-08
**Severity:** High — hides production failures

### Problem
Metrics tracking and crypto prices routes returned `success: true` on internal errors to "not disrupt UX." This made failures invisible.

### Rule
**If an operation fails, return `success: false`.** Let the client decide how to handle it. Silent "success" on error makes debugging impossible.

---

## Array.sort() mutates in-place — always spread first

**Date:** 2026-02-08
**Severity:** Medium — caused subtle React re-render bugs

### Rule
**Always use `[...array].sort()` instead of `array.sort()`.** In-place mutation breaks React's reference equality checks and can cause stale UI.

---

## Redis KEYS command blocks the server — use SCAN

**Date:** 2026-02-08
**Severity:** High — could block Redis in production

### Rule
**Never use Redis `KEYS` in application code.** Use `SCAN` with cursor-based iteration for non-blocking pattern matching.

---

## Never self-reference API routes via HTTP fetch from server-side code

**Date:** 2026-02-13
**Severity:** Critical — broke trending sports entirely in production

### Problem
The analytics API route called `fetchPostsViaInternalApi()` which made an HTTP fetch to `${NEXT_PUBLIC_APP_URL}/api/hive/posts`. On Vercel, `NEXT_PUBLIC_APP_URL` wasn't set, so it fell back to `http://localhost:3000` — which doesn't exist in a serverless environment. The fetch silently failed, returning empty posts, causing trending sports to always be empty.

### Fix
Replace the HTTP self-fetch with a direct call to `fetchSportsblockPosts()`. Server-side API routes can import and call server functions directly.

### Rule
**Never make HTTP requests from an API route to another API route on the same server.** Import the function directly instead. Self-referencing fetches fail in serverless environments (Vercel, Lambda) where `localhost` doesn't work.

---

## Blockchain broadcasts must be per-op idempotent

**Date:** 2026-02-27
**Severity:** Critical — caused double-payments on partial broadcast failure

### Problem
`broadcastHiveEngineOps` sends each transfer one at a time in a loop. When broadcasting multiple payouts/refunds in a single call, if op 2 of 3 fails, op 1 is already on-chain. On retry, all ops are re-sent — **double-paying** op 1's recipient. This was fixed for fees (via `feeTxId`) but payouts and refunds had no per-stake idempotency.

### Fix
Broadcast one op per stake, immediately record success in DB (`payoutTxId` for payouts, `refunded = true` for refunds) before moving to the next. On retry, skip stakes that already have their success marker set. Applied to all three broadcast sites:
1. Payout broadcast in `executeSettlement` (normal path)
2. Refund broadcast in `executeSettlement` (no-market path)
3. Refund broadcast in `executeVoidRefund` (also made retry-safe by accepting VOID status)

### Rule
**Never broadcast multiple blockchain transfers in a single batch call.** Broadcast one op at a time, persist the result to DB immediately, and check for prior success before each op. This makes any multi-transfer flow safely resumable on partial failure.

