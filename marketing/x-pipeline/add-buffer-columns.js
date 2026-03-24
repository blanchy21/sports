#!/usr/bin/env node

/**
 * Adds tweet_text and buffer_priority columns to the marketing matrix CSV.
 * Pre-fills the top 10 posts. Run once.
 *
 * Usage: node marketing/x-pipeline/add-buffer-columns.js
 */

const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-require-imports
const path = require('path'); // eslint-disable-line @typescript-eslint/no-require-imports

const CSV_PATH = path.resolve(__dirname, '../sportsblock-marketing-matrix.csv');

// Top 10 posts keyed by figma_frame_name pattern
const TOP_10 = {
  'Contest Card — Void — "IPL Contest"': {
    priority: 1,
    text: '🏏 IPL Prediction Contest is LIVE.\n\nPredict every match. Win 10,000 MEDALS. Free entry.\n\nsportsblock.app\n\n#SportsBlock #IPL2026 #IPL #Cricket',
  },
  'Contest Card — Stadium — "IPL Contest"': {
    priority: 2,
    text: 'Think you know cricket better than everyone?\n\nProve it. IPL Contest on SportsBlock. Free entry.\n\nsportsblock.app\n\n#SportsBlock #IPL2026 #CricketPredictions #MEDALS',
  },
  'Contest Card — Gold Prestige — "IPL Contest"': {
    priority: 3,
    text: 'The IPL Prediction Contest prize pool: 10,000 MEDALS.\n\nThe entry fee: zero.\n\nPredict every IPL 2026 match on SportsBlock. Climb the leaderboard. The sharpest cricket mind takes the pot.\n\nsportsblock.app\n\n#SportsBlock #IPL2026 #IPL',
  },
  'Social Post — Void — "Sportsbites"': {
    priority: 4,
    text: 'Your hot take. 280 characters. Real MEDALS.\n\nSportsbites on SportsBlock.\n\nsportsblock.app\n\n#SportsBlock #SportsBites #HotTake #MatchDay',
  },
  'Social Post — Stadium — "Earn"': {
    priority: 5,
    text: 'They profit from your takes. You get nothing.\n\nFlip the script. Earn MEDALS on SportsBlock.\n\nsportsblock.app\n\n#SportsBlock #EarnCrypto #HIVE #SportsBetting',
  },
  'Social Post — Void — "Community"': {
    priority: 6,
    text: "No politics. No drama. Just sport.\n\nSportsBlock — the community you've been looking for.\n\nsportsblock.app\n\n#SportsBlock #Web3Sports #SportsCommunity #HIVE",
  },
  'Social Post — Teal Accent — "IPL Contest"': {
    priority: 7,
    text: 'IPL season + SportsBlock = MEDALS.\n\nFree prediction contest. 10,000 MEDALS prize.\n\nsportsblock.app\n\n#SportsBlock #IPL2026 #Cricket #T20',
  },
  'Prediction Card — Void — "Predictions"': {
    priority: 8,
    text: 'The smart money is on SportsBlock Prediction Bites.\n\nStake. Predict. Earn.\n\nsportsblock.app\n\n#SportsBlock #PredictionMarkets #SportsBetting #EarnCrypto',
  },
  'Social Post — Stadium — "Long Form"': {
    priority: 9,
    text: 'Sports writers deserve to get paid.\n\nLong-form content earns MEDALS on SportsBlock.\n\nsportsblock.app\n\n#SportsBlock #SportsAnalysis #DeepDive #MEDALS',
  },
  'Contest Card — Void — "Masters Contest"': {
    priority: 10,
    text: 'Masters Prediction Contest — LIVE.\n\nPick the winner. Win 5,000 MEDALS. Free entry.\n\nsportsblock.app\n\n#SportsBlock #TheMasters #Masters2026 #Golf',
  },
};

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseAndRewrite() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split('\n');

  // Check if columns already exist
  if (lines[0].includes('tweet_text')) {
    console.log('Columns already exist. Skipping.');
    return;
  }

  // Add new column headers
  lines[0] = lines[0].trimEnd() + ',tweet_text,buffer_priority';

  // Process each data line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line) continue;

    // Extract figma_frame_name (last column, might be quoted)
    const frameName = extractFrameName(line);

    const match = TOP_10[frameName];
    if (match) {
      // Quote the tweet text (may contain commas, newlines)
      const quotedText = '"' + match.text.replace(/"/g, '""') + '"';
      lines[i] = line + ',' + quotedText + ',' + match.priority;
      console.log(`  ✅ Priority ${match.priority}: ${frameName}`);
    } else {
      // Empty columns — user can fill in later
      lines[i] = line + ',,';
    }
  }

  fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf-8');
  console.log(`\nUpdated: ${CSV_PATH}`);
  console.log('Added columns: tweet_text, buffer_priority');
  console.log('\nTo add more posts: edit the CSV, set tweet_text and buffer_priority for any row.');
}

function extractFrameName(line) {
  // The figma_frame_name is the last field, often quoted with internal quotes
  // Find the last field by parsing from the end
  let inQuotes = false;
  let lastComma = -1;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuotes = !inQuotes;
    if (line[i] === ',' && !inQuotes) lastComma = i;
  }

  let field = line.substring(lastComma + 1).trim();
  // Remove outer quotes
  if (field.startsWith('"') && field.endsWith('"')) {
    field = field.slice(1, -1).replace(/""/g, '"');
  }
  return field;
}

parseAndRewrite();
