# Code Review Fixes — 2026-02-28

## Plan

See full plan: `~/.claude/plans/eager-drifting-glade.md`
See full review: `tasks/code-review-2026-02-28.md`

## Execution Order

### 1. Atomic Settlement Locking (H2) ✅
- [x] `src/lib/predictions/settlement.ts` — Replace read-then-write with atomic `updateMany` WHERE status
- [x] Apply same pattern to `executeVoidRefund`

### 2. Remove Unbounded Stakes from List (H4) ✅
- [x] `src/app/api/predictions/route.ts:65-70` — Only fetch current user's stakes, add `_count`
- [x] `src/lib/predictions/serialize.ts` — Add `includeStakers` option, handle `_count` for `canModify`

### 3. Quick Wins Batch ✅
- [x] `findFirst` → `findUnique` in 4 files: `sb-session/route.ts:364`, `complete-onboarding/route.ts:42`, `account-status/route.ts:32`, `download-keys/route.ts:60`
- [x] `src/lib/cache/index.ts:385-391` — Fix `getTieredCache()` race condition with promise dedup
- [x] `PredictionBiteCard.tsx:133` + `PredictionEditModal.tsx:48` — Add `credentials: 'include'`
- [x] Delete dead `src/stores/postStore.ts`
- [x] `TopStakersWidget.tsx:142-149` — Gate SwapModal render with `swapOpen &&`
- [x] Add `error.tsx` + `loading.tsx` to `/predictions`

### 4. Countdown Timer Consolidation (H7) ✅
- [x] Create `src/hooks/useCountdownTick.ts` — single shared timer with visibility guard
- [x] `PredictionsFeed.tsx` — use shared tick, pass to cards
- [x] `PredictionBiteCard.tsx` — remove per-card setInterval, derive from tick prop, wrap in React.memo

### 5. Extract boundedCacheSet (H8) ✅
- [x] Create `src/lib/cache/bounded-map.ts` (with `cleanupExpired` helper)
- [x] Replace in: `hive/account/summary/route.ts`, `hive/notifications/route.ts`, `hive/sportsbites/route.ts`

### 6. Decimal Arithmetic (H3) ✅
- [x] `src/lib/predictions/odds.ts` — Use Prisma Decimal for calculateSettlement
- [x] `src/lib/predictions/settlement.ts:66-74` — Stop calling .toNumber(), pass Decimal directly
- [x] `src/lib/predictions/escrow.ts` — Accept `{ toNumber(): number } | number` amounts

### 7. Stake Transaction Verification (H1) ✅
- [x] Create `src/lib/predictions/verify-stake.ts` — verify txId against Hive blockchain
- [x] `src/app/api/predictions/[id]/stake/confirm/route.ts` — Call verification before DB write

## Round 2 — Code Review Fixes

### 8. Sanitize Hive Error Messages (M3) ✅
- [x] `src/lib/api/response.ts:684` — Replace `error.message` with generic message (already logged server-side)

### 9. Import Shared Node List (M11) ✅
- [x] `src/lib/predictions/settlement.ts` — Use `HIVE_NODES` from `@/lib/hive-workerbee/nodes`
- [x] `src/lib/predictions/verify-stake.ts` — Same

### 10. CSRF on PATCH Batch-Check Endpoints (M2) ✅
- [x] `src/app/api/soft/reactions/route.ts` — Wrap PATCH in `withCsrfProtection`
- [x] `src/app/api/soft/poll-votes/route.ts` — Same
- [x] `src/app/api/soft/follows/route.ts` — Same

### 11. Extract Duplicate Utils (L8, L9) ✅
- [x] `src/lib/utils/formatting.ts` — Added `timeAgo()` and `formatCompact()`
- [x] `src/components/predictions/PredictionBiteCard.tsx` — Import `timeAgo` from formatting
- [x] `src/components/leaderboard/TopStakersWidget.tsx` — Import `formatCompact` from formatting
- [x] `src/components/medals/StakingRankCard.tsx` — Import `formatCompact` from formatting

### 12. Reaction Toggle Race Condition (M7) ✅
- [x] `src/app/api/soft/reactions/route.ts` — Refactored to use `prisma.reaction.upsert` (atomic, no P2002 possible)

### 13. Unified Posts: Exclude Content from List Queries (M5) ✅
- [x] `src/app/api/unified/posts/route.ts` — Added `LIST_SELECT` constant, applied to all 3 `findMany` calls
- [x] `postToSoftPost` — Made `content` optional, falls back to `excerpt`

### 14. Stake Token Replay Protection (M1) ✅
- [x] `prisma/schema.prisma` — Added `@@unique([predictionId, txId])` to `PredictionEscrowLedger`
- [x] `src/app/api/predictions/[id]/stake/confirm/route.ts` — P2002 catch → "Stake already confirmed"
- [x] DB: Cleaned 28 bad `[object Object]` txIds → NULL, applied unique constraint
- [x] `npx prisma generate`

### 15. Prediction DELETE Two-Phase Refund (M6) ✅
- [x] `src/app/api/predictions/[id]/route.ts` — Replaced manual refund with `executeVoidRefund`
- [x] Removed unused `decimalToNumber`, `buildRefundOps`, `broadcastHiveEngineOps` imports

### 16. Separate Fee Ops Broadcast (M12) ✅
- [x] `prisma/schema.prisma` — Added `feeBurnTxId`, `feeRewardTxId` to `Prediction`
- [x] `src/lib/predictions/escrow.ts` — `buildFeeOps` now returns `FeeOps { burn, reward }` instead of array
- [x] `src/lib/predictions/settlement.ts` — Broadcast burn + reward independently with per-op DB markers
- [x] DB: `ALTER TABLE predictions ADD COLUMN fee_burn_tx_id, fee_reward_tx_id`

## Round 2 Verification

- `npx tsc --noEmit` — ✅ clean
- `npx eslint` on all changed files — ✅ clean
- `npm run test` — ✅ 926 passed, 0 failed (60/60 suites)

## Round 1 Verification

- `npx tsc --noEmit` — ✅ clean
- `npx eslint` on all changed files — ✅ clean
- `npm run test` — ✅ 926 passed, 0 failed (60/60 suites)
- Test fix: updated `hive-download-keys.test.ts` mock from `findFirst` to `findUnique`
