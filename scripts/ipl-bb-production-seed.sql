-- IPL Boundary Blackjack — Production Setup
-- Run against production Supabase: source .env && psql "$DATABASE_URL" -f scripts/ipl-bb-production-seed.sql

-- 1. Create tables
CREATE TABLE IF NOT EXISTS ipl_bb_competitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  season TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  date_from TIMESTAMP WITH TIME ZONE NOT NULL,
  date_to TIMESTAMP WITH TIME ZONE NOT NULL,
  prize_first INTEGER NOT NULL DEFAULT 2500,
  prize_second INTEGER NOT NULL DEFAULT 1500,
  prize_third INTEGER NOT NULL DEFAULT 1000,
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_entries INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipl_bb_matches (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES ipl_bb_competitions(id),
  match_number INTEGER NOT NULL,
  cricket_data_match_id TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  venue TEXT,
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  actual_boundaries INTEGER,
  fours INTEGER,
  sixes INTEGER,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS ipl_bb_entries (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES ipl_bb_competitions(id),
  username TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  bust_count INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  submitted_count INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER,
  prize_awarded INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competition_id, username)
);

CREATE TABLE IF NOT EXISTS ipl_bb_picks (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL,
  match_id TEXT NOT NULL REFERENCES ipl_bb_matches(id),
  entry_id TEXT NOT NULL REFERENCES ipl_bb_entries(id),
  username TEXT NOT NULL,
  guess INTEGER NOT NULL,
  points_scored INTEGER,
  is_bust BOOLEAN,
  first_submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, username)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_ipl_bb_matches_competition ON ipl_bb_matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_ipl_bb_entries_points ON ipl_bb_entries(competition_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_ipl_bb_picks_match ON ipl_bb_picks(match_id);
CREATE INDEX IF NOT EXISTS idx_ipl_bb_picks_entry ON ipl_bb_picks(entry_id);

-- 3. Seed competitions (5,000 MEDALS per round)
INSERT INTO ipl_bb_competitions (id, title, season, round_number, status, date_from, date_to, prize_first, prize_second, prize_third, total_matches)
VALUES
  ('ipl-bb-2026-r1', 'IPL Boundary Blackjack — Round 1', 'IPL 2026', 1, 'active', '2026-03-28T00:00:00Z', '2026-04-03T23:59:59Z', 2500, 1500, 1000, 7),
  ('ipl-bb-2026-r2', 'IPL Boundary Blackjack — Round 2', 'IPL 2026', 2, 'open', '2026-04-04T00:00:00Z', '2026-04-08T23:59:59Z', 2500, 1500, 1000, 7),
  ('ipl-bb-2026-r3', 'IPL Boundary Blackjack — Round 3', 'IPL 2026', 3, 'open', '2026-04-09T00:00:00Z', '2026-04-13T23:59:59Z', 2500, 1500, 1000, 7)
ON CONFLICT (id) DO NOTHING;

-- 4. Round 1 matches (28 Mar – 3 Apr) — ALL OPEN
INSERT INTO ipl_bb_matches (id, competition_id, match_number, home_team, away_team, venue, kickoff_time, status)
VALUES
  ('ipl-bb-r1-m1', 'ipl-bb-2026-r1', 1, 'RCB', 'SRH', 'M. Chinnaswamy Stadium, Bengaluru', '2026-03-28T14:00:00Z', 'open'),
  ('ipl-bb-r1-m2', 'ipl-bb-2026-r1', 2, 'MI', 'KKR', 'Wankhede Stadium, Mumbai', '2026-03-29T14:00:00Z', 'open'),
  ('ipl-bb-r1-m3', 'ipl-bb-2026-r1', 3, 'RR', 'CSK', 'Sawai Mansingh Stadium, Jaipur', '2026-03-30T14:00:00Z', 'open'),
  ('ipl-bb-r1-m4', 'ipl-bb-2026-r1', 4, 'PBKS', 'GT', 'PCA Stadium, Mohali', '2026-03-31T14:00:00Z', 'open'),
  ('ipl-bb-r1-m5', 'ipl-bb-2026-r1', 5, 'DC', 'LSG', 'Arun Jaitley Stadium, Delhi', '2026-04-01T14:00:00Z', 'open'),
  ('ipl-bb-r1-m6', 'ipl-bb-2026-r1', 6, 'SRH', 'MI', 'Rajiv Gandhi Intl Stadium, Hyderabad', '2026-04-02T14:00:00Z', 'open'),
  ('ipl-bb-r1-m7', 'ipl-bb-2026-r1', 7, 'CSK', 'KKR', 'MA Chidambaram Stadium, Chennai', '2026-04-03T14:00:00Z', 'open')
ON CONFLICT (id) DO NOTHING;

-- 5. Round 2 matches (4–8 Apr, double-headers on Sat 4 & Sun 5) — UPCOMING
INSERT INTO ipl_bb_matches (id, competition_id, match_number, home_team, away_team, venue, kickoff_time, status)
VALUES
  ('ipl-bb-r2-m1', 'ipl-bb-2026-r2', 1, 'DC', 'MI', 'Arun Jaitley Stadium, Delhi', '2026-04-04T10:00:00Z', 'upcoming'),
  ('ipl-bb-r2-m2', 'ipl-bb-2026-r2', 2, 'GT', 'RR', 'Narendra Modi Stadium, Ahmedabad', '2026-04-04T14:00:00Z', 'upcoming'),
  ('ipl-bb-r2-m3', 'ipl-bb-2026-r2', 3, 'SRH', 'LSG', 'Rajiv Gandhi Intl Stadium, Hyderabad', '2026-04-05T10:00:00Z', 'upcoming'),
  ('ipl-bb-r2-m4', 'ipl-bb-2026-r2', 4, 'RCB', 'CSK', 'M. Chinnaswamy Stadium, Bengaluru', '2026-04-05T14:00:00Z', 'upcoming'),
  ('ipl-bb-r2-m5', 'ipl-bb-2026-r2', 5, 'KKR', 'PBKS', 'Eden Gardens, Kolkata', '2026-04-06T14:00:00Z', 'upcoming'),
  ('ipl-bb-r2-m6', 'ipl-bb-2026-r2', 6, 'MI', 'RR', 'Wankhede Stadium, Mumbai', '2026-04-07T14:00:00Z', 'upcoming'),
  ('ipl-bb-r2-m7', 'ipl-bb-2026-r2', 7, 'CSK', 'DC', 'MA Chidambaram Stadium, Chennai', '2026-04-08T14:00:00Z', 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- 6. Round 3 matches (9–13 Apr) — UPCOMING
INSERT INTO ipl_bb_matches (id, competition_id, match_number, home_team, away_team, venue, kickoff_time, status)
VALUES
  ('ipl-bb-r3-m1', 'ipl-bb-2026-r3', 1, 'LSG', 'KKR', 'Ekana Cricket Stadium, Lucknow', '2026-04-09T14:00:00Z', 'upcoming'),
  ('ipl-bb-r3-m2', 'ipl-bb-2026-r3', 2, 'RCB', 'RR', 'Narendra Modi Stadium, Ahmedabad', '2026-04-10T14:00:00Z', 'upcoming'),
  ('ipl-bb-r3-m3', 'ipl-bb-2026-r3', 3, 'SRH', 'PBKS', 'PCA Stadium, Mohali', '2026-04-11T10:00:00Z', 'upcoming'),
  ('ipl-bb-r3-m4', 'ipl-bb-2026-r3', 4, 'DC', 'CSK', 'MA Chidambaram Stadium, Chennai', '2026-04-11T14:00:00Z', 'upcoming'),
  ('ipl-bb-r3-m7', 'ipl-bb-2026-r3', 7, 'LSG', 'GT', 'New Chandigarh', '2026-04-12T10:00:00Z', 'upcoming'),
  ('ipl-bb-r3-m8', 'ipl-bb-2026-r3', 8, 'MI', 'RCB', 'Wankhede Stadium, Mumbai', '2026-04-12T14:00:00Z', 'upcoming'),
  ('ipl-bb-r3-m9', 'ipl-bb-2026-r3', 9, 'SRH', 'RR', 'Rajiv Gandhi Intl Stadium, Hyderabad', '2026-04-13T14:00:00Z', 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- 7. Verification
SELECT '=== Competitions ===' AS section;
SELECT id, title, status, prize_first + prize_second + prize_third AS total_prize, total_matches
FROM ipl_bb_competitions ORDER BY round_number;

SELECT '=== Match Counts ===' AS section;
SELECT c.title, COUNT(m.id) AS matches, STRING_AGG(DISTINCT m.status, ', ') AS statuses
FROM ipl_bb_competitions c
JOIN ipl_bb_matches m ON m.competition_id = c.id
GROUP BY c.id, c.title ORDER BY c.round_number;
