-- Seed: World Cup 2026 Fantasy Contest
-- Run: source .env && psql "$DATABASE_URL" -f scripts/seed-world-cup-2026.sql

BEGIN;

-- 0. Clean up old contest (no entries exist, safe to delete)
DELETE FROM contest_teams WHERE contest_id = (SELECT id FROM contests WHERE slug = 'world-cup-2026');
DELETE FROM contest_interests WHERE contest_id = (SELECT id FROM contests WHERE slug = 'world-cup-2026');
DELETE FROM contests WHERE slug = 'world-cup-2026';

-- 1. Create the contest
INSERT INTO contests (
  id, slug, title, description, contest_type, status,
  rules,
  entry_fee, max_entries,
  platform_fee_pct, creator_fee_pct, prize_pool, prize_model,
  registration_opens, registration_closes,
  starts_at, ends_at,
  creator_username, type_config, entry_count,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'world-cup-2026',
  'World Cup 2026 Fantasy',
  'Pick 16 countries from 4 pots, assign multipliers 1-16, and earn points as the World Cup progresses. Top 3 win MEDALS prizes!',
  'WORLD_CUP_FANTASY',
  'REGISTRATION',
  E'## How It Works\n\n1. **Pick 16 teams** — Select 4 teams from each of the 4 pots\n2. **Assign multipliers** — Give each team a unique multiplier from 1 to 16. Higher multiplier = more points from that team\n3. **Set your tie-breaker** — Predict the total number of goals scored in the entire tournament (regular time only)\n\n## Scoring\n\n- **Win:** 3 points\n- **Draw:** 1 point\n- **Goal scored:** 1 point per goal\n- Points are multiplied by your assigned multiplier for each team\n\n## Knockout Bonuses\n\nTeams that progress through knockout rounds earn cumulative bonus points:\n- Round of 32: +2\n- Round of 16: +3\n- Quarter-Final: +4\n- Semi-Final: +5\n- Runner-Up: +6\n- Champion: +7\n\nAll bonuses are multiplied by your assigned multiplier.\n\n## Prizes\n\n**Guaranteed Prize Pool: 500 HIVE + 10,000 MEDALS**\n\n- 1st Place: 60% (6,000 MEDALS + 300 HIVE)\n- 2nd Place: 25% (2,500 MEDALS + 125 HIVE)\n- 3rd Place: 15% (1,500 MEDALS + 75 HIVE)\n\nTie-breaker: closest prediction to the actual total goals scored wins.',
  0,         -- free entry
  500,       -- max 500 entries
  0,         -- no platform fee (FIXED model)
  0,         -- no creator fee (FIXED model)
  10000,     -- 10,000 MEDALS prize pool
  'FIXED',
  '2026-04-21T00:00:00Z',  -- registration opens April 21
  '2026-06-11T00:00:00Z',  -- registration closes when tournament starts
  '2026-06-11T00:00:00Z',  -- starts June 11
  '2026-07-19T23:59:59Z',  -- ends July 19
  'sportsblock',
  '{"prizeHive": 500}'::jsonb,
  0,
  NOW(), NOW()
);

-- 2. Seed the 48 teams (linked to the contest we just created)
WITH contest AS (
  SELECT id FROM contests WHERE slug = 'world-cup-2026' LIMIT 1
)
INSERT INTO contest_teams (id, contest_id, name, code, pot, group_letter, eliminated, metadata)
SELECT
  gen_random_uuid(),
  contest.id,
  t.name,
  t.code,
  t.pot,
  t.grp,
  false,
  NULL
FROM contest, (VALUES
  -- Pot 1
  ('Mexico',         'MEX', 1, 'A'),
  ('Canada',         'CAN', 1, 'B'),
  ('Brazil',         'BRA', 1, 'C'),
  ('United States',  'USA', 1, 'D'),
  ('Germany',        'GER', 1, 'E'),
  ('Netherlands',    'NED', 1, 'F'),
  ('Belgium',        'BEL', 1, 'G'),
  ('Spain',          'ESP', 1, 'H'),
  ('France',         'FRA', 1, 'I'),
  ('Argentina',      'ARG', 1, 'J'),
  ('Portugal',       'POR', 1, 'K'),
  ('England',        'ENG', 1, 'L'),

  -- Pot 2
  ('South Korea',    'KOR', 2, 'A'),
  ('Switzerland',    'SUI', 2, 'B'),
  ('Morocco',        'MAR', 2, 'C'),
  ('Australia',      'AUS', 2, 'D'),
  ('Ecuador',        'ECU', 2, 'E'),
  ('Japan',          'JPN', 2, 'F'),
  ('Iran',           'IRN', 2, 'G'),
  ('Uruguay',        'URU', 2, 'H'),
  ('Senegal',        'SEN', 2, 'I'),
  ('Austria',        'AUT', 2, 'J'),
  ('Colombia',       'COL', 2, 'K'),
  ('Croatia',        'CRO', 2, 'L'),

  -- Pot 3
  ('South Africa',   'RSA', 3, 'A'),
  ('Qatar',          'QAT', 3, 'B'),
  ('Scotland',       'SCO', 3, 'C'),
  ('Paraguay',       'PAR', 3, 'D'),
  ('Ivory Coast',    'CIV', 3, 'E'),
  ('Tunisia',        'TUN', 3, 'F'),
  ('Egypt',          'EGY', 3, 'G'),
  ('Saudi Arabia',   'KSA', 3, 'H'),
  ('Norway',         'NOR', 3, 'I'),
  ('Algeria',        'ALG', 3, 'J'),
  ('Uzbekistan',     'UZB', 3, 'K'),
  ('Panama',         'PAN', 3, 'L'),

  -- Pot 4
  ('Czechia',                'CZE', 4, 'A'),
  ('Bosnia & Herzegovina',   'BIH', 4, 'B'),
  ('Haiti',                  'HAI', 4, 'C'),
  ('Turkey',                 'TUR', 4, 'D'),
  ('Curacao',                'CUR', 4, 'E'),
  ('Sweden',                 'SWE', 4, 'F'),
  ('New Zealand',            'NZL', 4, 'G'),
  ('Cape Verde',             'CPV', 4, 'H'),
  ('Iraq',                   'IRQ', 4, 'I'),
  ('Jordan',                 'JOR', 4, 'J'),
  ('DR Congo',               'COD', 4, 'K'),
  ('Ghana',                  'GHA', 4, 'L')
) AS t(name, code, pot, grp);

-- 3. Verify
SELECT 'Contest created:' AS info, slug, status, entry_fee, prize_pool, prize_model
FROM contests WHERE slug = 'world-cup-2026';

SELECT 'Teams seeded:' AS info, COUNT(*) AS team_count,
       COUNT(DISTINCT pot) AS pots,
       COUNT(DISTINCT group_letter) AS groups
FROM contest_teams ct
JOIN contests c ON ct.contest_id = c.id
WHERE c.slug = 'world-cup-2026';

COMMIT;
