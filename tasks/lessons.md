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

## Hive API: `get_discussions_by_created` rejects `limit > 20`

**Date:** 2026-02-05
**Severity:** Medium — caused API routes to fail silently

### Problem
Some Hive nodes reject `get_discussions_by_created` with `limit` values above 20, returning "Invalid parameters". The `fetchSportsblockPosts` function allows up to 100 but the nodes don't support it.

### Fix
Paginate with `limit: 20` per request, using `nextCursor` for subsequent pages, up to the desired total.

### Rule
**Always use `limit <= 20` for Hive discussion queries.** Paginate if more posts are needed.

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
