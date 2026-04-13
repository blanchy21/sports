BEGIN;

CREATE TABLE "hol_competitions" (
  "id" TEXT PRIMARY KEY,
  "contest_slug" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'upcoming',
  "current_round" INTEGER NOT NULL DEFAULT 1,
  "total_rounds_planned" INTEGER NOT NULL,
  "buyback_cost_medals" DECIMAL(12,3) NOT NULL,
  "max_buybacks" INTEGER NOT NULL DEFAULT 2,
  "tieRule" TEXT NOT NULL DEFAULT 'survive',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "hol_competitions_status_idx" ON "hol_competitions"("status");

CREATE TABLE "hol_rounds" (
  "id" TEXT PRIMARY KEY,
  "competition_id" TEXT NOT NULL REFERENCES "hol_competitions"("id") ON DELETE CASCADE,
  "round_number" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'upcoming',
  "deadline" TIMESTAMP(3) NOT NULL,
  "baseline_total" INTEGER NOT NULL,
  "actual_total" INTEGER,
  "matches" JSONB NOT NULL,
  "resolved_at" TIMESTAMP(3),
  "resolved_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hol_rounds_competition_round_key" UNIQUE ("competition_id", "round_number")
);
CREATE INDEX "hol_rounds_competition_status_idx" ON "hol_rounds"("competition_id", "status");

CREATE TABLE "hol_entries" (
  "id" TEXT PRIMARY KEY,
  "competition_id" TEXT NOT NULL REFERENCES "hol_competitions"("id") ON DELETE CASCADE,
  "contest_entry_id" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'alive',
  "buybacks_used" INTEGER NOT NULL DEFAULT 0,
  "eliminated_round" INTEGER,
  "eliminated_at" TIMESTAMP(3),
  "final_rank" INTEGER,
  "prize_awarded" DECIMAL(12,3),
  "payout_tx_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hol_entries_competition_username_key" UNIQUE ("competition_id", "username")
);
CREATE INDEX "hol_entries_competition_status_idx" ON "hol_entries"("competition_id", "status");
CREATE INDEX "hol_entries_username_idx" ON "hol_entries"("username");

CREATE TABLE "hol_picks" (
  "id" TEXT PRIMARY KEY,
  "competition_id" TEXT NOT NULL REFERENCES "hol_competitions"("id") ON DELETE CASCADE,
  "entry_id" TEXT NOT NULL REFERENCES "hol_entries"("id") ON DELETE CASCADE,
  "round_number" INTEGER NOT NULL,
  "guess" TEXT NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'pending',
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hol_picks_entry_round_key" UNIQUE ("entry_id", "round_number")
);
CREATE INDEX "hol_picks_competition_round_idx" ON "hol_picks"("competition_id", "round_number");

CREATE TABLE "hol_buybacks" (
  "id" TEXT PRIMARY KEY,
  "competition_id" TEXT NOT NULL REFERENCES "hol_competitions"("id") ON DELETE CASCADE,
  "entry_id" TEXT NOT NULL REFERENCES "hol_entries"("id") ON DELETE CASCADE,
  "round_number" INTEGER NOT NULL,
  "medals_cost" DECIMAL(12,3) NOT NULL,
  "tx_id" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "hol_buybacks_entry_idx" ON "hol_buybacks"("entry_id");

COMMIT;
