# Match Threads Implementation

## Phase 1: Extract Shared TheSportsDB Module
- [x] Create `src/lib/sports/thesportsdb.ts` with extracted logic
- [x] Update `src/app/api/sports/events/route.ts` to import from shared module

## Phase 2: Match Threads Core Library + Types
- [x] Add `MatchThread` type to `src/types/sports.ts`
- [x] Export `transformToSportsbite` in `src/lib/hive-workerbee/sportsbites.ts`
- [x] Create `src/lib/hive-workerbee/match-threads.ts`

## Phase 3: Cron Job for Container Creation
- [x] Create `src/app/api/cron/match-thread-containers/route.ts`
- [x] Add cron entry to `vercel.json`

## Phase 4: API Routes
- [x] Create `src/app/api/match-threads/route.ts` (list)
- [x] Create `src/app/api/match-threads/[eventId]/bites/route.ts` (thread bites)
- [x] Create `src/app/api/match-threads/[eventId]/ensure/route.ts` (ensure container)
- [x] Create `src/lib/hive-workerbee/match-threads-server.ts` (soft bites fetching)

## Phase 5: Soft User Support
- [x] Add `matchThreadId` to `SoftSportsbite` in `src/types/auth.ts`
- [x] Update `src/app/api/soft/sportsbites/route.ts` — schema + storage + filtering

## Phase 6: Client-Side Posting
- [x] Modify `ComposeSportsbite.tsx` with `matchThreadEventId` prop

## Phase 7: UI Pages & Components
- [x] Create `src/app/match-threads/page.tsx` (listing)
- [x] Create `src/components/match-threads/MatchThreadCard.tsx`
- [x] Create `src/app/match-threads/[eventId]/page.tsx` (detail)
- [x] Create `src/components/match-threads/MatchThreadHeader.tsx`
- [x] Create `src/components/match-threads/MatchThreadFeed.tsx`

## Phase 8: Navigation
- [x] Add to Sidebar.tsx
- [x] Add to TopNavigation.tsx mobile menu

## Verification
- [x] `npx tsc --noEmit` — passes clean
- [x] Targeted eslint on new/modified files — passes clean
