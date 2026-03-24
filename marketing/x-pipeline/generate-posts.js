#!/usr/bin/env node

/**
 * SportsBlock X/Twitter Post Generator for Buffer
 *
 * Generates tweets across 5 content types:
 *   - Social Posts (brand awareness)
 *   - Prediction Cards (match predictions)
 *   - Contest Cards (IPL, Masters, etc.)
 *   - Sportsbites (short hot takes)
 *   - Long-form Posts (analysis threads)
 *
 * 4 brand themes: void, stadium, teal, prestige
 * 3 lengths per tweet: short, medium, long
 *
 * Outputs:
 *   1. A Buffer-ready CSV for bulk upload
 *   2. A markdown file with all tweet copy organized by content type
 *
 * Zero dependencies — uses only built-in Node.js modules.
 *
 * Usage: node marketing/x-pipeline/generate-posts.js
 */

const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-require-imports
const path = require('path'); // eslint-disable-line @typescript-eslint/no-require-imports

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CSV_PATH = path.resolve(__dirname, '../sportsblock-marketing-matrix.csv');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const BUFFER_CSV_PATH = path.join(OUTPUT_DIR, 'buffer-schedule.csv');
const TWEET_COPY_PATH = path.join(OUTPUT_DIR, 'tweet-copy.md');
const ASSETS_DIR = 'marketing/assets'; // relative from repo root

// Brand theme names (match Figma plugin)
const THEME_LABELS = {
  void: 'Void',
  stadium: 'Stadium',
  teal: 'Teal Accent',
  prestige: 'Gold Prestige',
};

// Hashtag pools — each tweet picks 3-4 from the relevant pool
const HASHTAG_POOLS = {
  earn: [
    '#SportsBlock',
    '#EarnCrypto',
    '#HIVE',
    '#SportsBetting',
    '#PredictionMarkets',
    '#Web3Sports',
    '#CryptoRewards',
    '#MEDALS',
    '#PlayToEarn',
  ],
  community: [
    '#SportsBlock',
    '#Web3Sports',
    '#SportsCommunity',
    '#HIVE',
    '#Web3',
    '#SportsFans',
    '#NoNoise',
    '#PureSports',
    '#MatchDay',
  ],
  ownership: [
    '#SportsBlock',
    '#Web3Sports',
    '#HIVE',
    '#OwnYourContent',
    '#Blockchain',
    '#Web3',
    '#Decentralized',
    '#ContentOwnership',
    '#CensorshipResistant',
  ],
  predictions: [
    '#SportsBlock',
    '#PredictionMarkets',
    '#SportsBetting',
    '#EarnCrypto',
    '#HIVE',
    '#StakeAndEarn',
    '#SportsPredictions',
    '#BackYourTake',
  ],
  'ipl-contest': [
    '#SportsBlock',
    '#IPL2026',
    '#IPL',
    '#Cricket',
    '#CricketPredictions',
    '#MEDALS',
    '#EarnCrypto',
    '#T20',
    '#PredictionContest',
  ],
  'masters-contest': [
    '#SportsBlock',
    '#TheMasters',
    '#Masters2026',
    '#Golf',
    '#GolfPredictions',
    '#MEDALS',
    '#Augusta',
    '#PredictionContest',
  ],
  sportsbites: [
    '#SportsBlock',
    '#SportsBites',
    '#HotTake',
    '#MatchDay',
    '#MEDALS',
    '#SportsTakes',
    '#Web3Sports',
    '#EarnCrypto',
  ],
  longform: [
    '#SportsBlock',
    '#SportsAnalysis',
    '#DeepDive',
    '#MEDALS',
    '#HIVE',
    '#SportsTakes',
    '#Web3Sports',
    '#EarnCrypto',
  ],
};

// Post times in UTC (hour)
const POST_TIMES = ['09:00', '13:00', '18:00'];

// ---------------------------------------------------------------------------
// Hashtag rotation — picks 3-4 unique tags from pool, rotating through
// ---------------------------------------------------------------------------

const hashtagCounters = {};
function pickHashtags(ctaId, count) {
  const pool = HASHTAG_POOLS[ctaId] || HASHTAG_POOLS.earn;
  const key = ctaId;
  if (hashtagCounters[key] === undefined) hashtagCounters[key] = 0;

  const start = hashtagCounters[key] % pool.length;
  const tags = [];
  tags.push('#SportsBlock');
  let idx = start;
  while (tags.length < count) {
    const tag = pool[idx % pool.length];
    if (!tags.includes(tag)) tags.push(tag);
    idx++;
    if (idx - start > pool.length) break;
  }
  hashtagCounters[key] = (start + 2) % pool.length;
  return tags.join(' ');
}

// ---------------------------------------------------------------------------
// Tweet banks — organized by ctaId > template > theme > length
// ---------------------------------------------------------------------------

const tweets = {
  // =========================================================================
  // EARN REWARDS
  // =========================================================================
  earn: {
    'social-post': {
      void: {
        short:
          'Your sports knowledge has real value.\n\nSportsBlock converts it into MEDALS.\n\nsportsblock.app',
        medium:
          'What if every sports post you wrote actually earned you something?\n\nOn SportsBlock, it does. Write analysis, share predictions, earn MEDALS — real crypto rewards for genuine sports knowledge.\n\nsportsblock.app',
        long: "The world's best sports minds are giving away their insights for free.\n\nSportsBlock changes that equation. Every post you write, every prediction you nail, every match thread contribution — it all earns MEDALS. Real cryptocurrency you can trade, stake, or hold.\n\nPremium sports knowledge deserves premium rewards.\n\nsportsblock.app",
      },
      stadium: {
        short:
          'They profit from your takes. You get nothing.\n\nFlip the script. Earn MEDALS on SportsBlock.\n\nsportsblock.app',
        medium:
          'Platforms got rich off your sports content.\n\nSportsBlock pays you back. Every post earns MEDALS. Every correct prediction multiplies them. No middleman skimming your value.\n\nsportsblock.app',
        long: 'Other platforms sell your data, suppress your reach, and give you zero in return.\n\nSportsBlock does the opposite. Post your takes — earn MEDALS. Nail a prediction — earn more. Build a following — earn even more.\n\nYour content, your rewards. No one takes a cut.\n\nsportsblock.app',
      },
      teal: {
        short:
          'Already obsessed with sport? Might as well get paid for it.\n\nJoin SportsBlock.\n\nsportsblock.app',
        medium:
          "Your mates already think you're a genius at picking winners.\n\nTime to prove it on SportsBlock and earn MEDALS while you're at it. Free to join, free to post, free to earn.\n\nsportsblock.app",
        long: 'You already spend hours talking sport with your mates, reading match previews, debating lineups.\n\nWhat if that time actually earned you something?\n\nSportsBlock rewards every post, every prediction, every match thread moment with MEDALS. Real crypto, zero fees.\n\nJust you doing what you love — and finally getting rewarded.\n\nsportsblock.app',
      },
      prestige: {
        short:
          "Hot take + right call = real crypto.\n\nThat's SportsBlock. Start earning now.\n\nsportsblock.app",
        medium:
          'Every post. Every prediction. Every match day take.\n\nAll earning you MEDALS on SportsBlock. Zero fees, real crypto rewards. The question is — why are you still posting for free?\n\nsportsblock.app',
        long: "Right now, someone is making money off your sports takes.\n\nIt's not you.\n\nSportsBlock changes everything. Post your analysis — earn MEDALS. Call the upset — earn more. Build your reputation — earn even more. Real crypto. Zero fees. No catch.\n\nStop giving it away for free.\n\nsportsblock.app",
      },
    },
    'prediction-card': {
      void: {
        short:
          'Predict. Earn. Repeat.\n\nSportsBlock rewards precision with MEDALS.\n\nsportsblock.app',
        medium:
          'Stake MEDALS on your prediction. Get the call right, and your rewards compound.\n\nSportsBlock turns sports intelligence into tangible returns. Precision pays.\n\nsportsblock.app',
        long: "The best analysts don't just talk — they back their calls.\n\nOn SportsBlock, every correct prediction earns you MEDALS. Stake on outcomes you believe in. Build a track record that speaks for itself.\n\nNo bookmaker margins. No house edge. Just rewards for getting it right.\n\nsportsblock.app",
      },
      stadium: {
        short:
          'Correct call. Real crypto. No middleman.\n\nSportsBlock Prediction Bites.\n\nsportsblock.app',
        medium:
          'Imagine getting paid every time you called the result before kickoff.\n\nSportsBlock makes it real. Stake MEDALS on your prediction. Nail it, and the pool pays you. Simple.\n\nsportsblock.app',
        long: 'Bookmakers make billions off your knowledge. They set the odds, take the margin, and profit whether you win or lose.\n\nSportsBlock eliminates the house. Stake MEDALS peer-to-peer. Correct predictions split the pool. Your edge is finally your own.\n\nStop making bookies rich.\n\nsportsblock.app',
      },
      teal: {
        short:
          'Think you know the score? Earn MEDALS for proving it.\n\nSportsBlock.\n\nsportsblock.app',
        medium:
          "Your group chat already knows you've got the sharpest predictions.\n\nNow make it official. Stake MEDALS on SportsBlock, prove your knowledge, and earn real rewards.\n\nsportsblock.app",
        long: 'Remember that time you called the exact scoreline and nobody believed you?\n\nOn SportsBlock, your predictions are on the record. Stake MEDALS, make your call, and when you\'re right — you earn real crypto rewards.\n\nNo more "I told you so." Just proof and MEDALS.\n\nsportsblock.app',
      },
      prestige: {
        short:
          'Big match. Bigger prediction. Biggest rewards.\n\nStake MEDALS on SportsBlock now.\n\nsportsblock.app',
        medium:
          "The match starts in hours. You already know what's going to happen.\n\nBack that instinct with MEDALS on SportsBlock. Right calls get rewarded. Are you in?\n\nsportsblock.app",
        long: "You've been calling results all season. You saw the upset coming. You knew the underdog would cover.\n\nNow there's a place where that knowledge pays off — literally. SportsBlock Prediction Bites turn your calls into MEDALS. Every correct prediction earns crypto.\n\nThe next big match is coming. Don't watch from the sidelines.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // COMMUNITY
  // =========================================================================
  community: {
    'social-post': {
      void: {
        short:
          "No politics. No drama. Just sport.\n\nSportsBlock — the community you've been looking for.\n\nsportsblock.app",
        medium:
          'The best sports conversations happen when everything else gets out of the way.\n\nSportsBlock is a curated community for fans who want match threads, analysis, and predictions — nothing else.\n\nsportsblock.app',
        long: 'Every sports community eventually gets overrun by politics, ads, and engagement bait.\n\nSportsBlock was built to prevent that. Pure sports content. Live match threads. Prediction markets. A community where every voice is a sports voice.\n\nNo algorithm. No noise. Just the conversation sport deserves.\n\nsportsblock.app',
      },
      stadium: {
        short: 'Sports Twitter is broken.\n\nSportsBlock is the fix.\n\nsportsblock.app',
        medium:
          'Your timeline is 10% sport, 90% garbage.\n\nSportsBlock strips away the noise. Match threads, predictions, sportsbites — just fans who actually care about the game. No ads. No algorithm.\n\nsportsblock.app',
        long: "We didn't build SportsBlock because the world needed another social platform.\n\nWe built it because sports fans deserve better than toxic timelines, suppressed posts, and ads disguised as content.\n\nHere it's different. Match threads. Predictions. Hot takes. That's the whole product.\n\nNo politics. No drama. Just sport.\n\nsportsblock.app",
      },
      teal: {
        short:
          'Tired of the chaos on sports Twitter?\n\nSportsBlock — all sport, all the time.\n\nsportsblock.app',
        medium:
          "No algorithm deciding what you see.\nNo ads interrupting the match thread.\nNo drama drowning out the sport.\n\nJust real fans talking the game they love. That's SportsBlock.\n\nsportsblock.app",
        long: 'Remember the early days of sports forums? When it was just fans geeking out about the game?\n\nSportsBlock brings that energy back — but better. Live match threads, prediction markets, sportsbites, and a community that actually talks sport.\n\nFree to join. Zero ads. Pure vibes.\n\nsportsblock.app',
      },
      prestige: {
        short:
          'Match day hits different on SportsBlock.\n\nLive threads. Hot takes. Zero noise.\n\nsportsblock.app',
        medium:
          'The best sports debates happen when everyone in the room is actually there for the sport.\n\nSportsBlock keeps it pure. Match threads that go off. Predictions with stakes. A community that lives for the game.\n\nsportsblock.app',
        long: "There's nothing worse than scrolling through political takes when you just want to talk about the match.\n\nSportsBlock fixes that permanently. Every post is about sport. Every thread is about the game. Every user is here because they love it.\n\nThis is the sports community the internet was supposed to have.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // OWNERSHIP
  // =========================================================================
  ownership: {
    'social-post': {
      void: {
        short:
          'Your content. Your rules. Your wallet.\n\nSportsBlock runs on HIVE. Zero fees.\n\nsportsblock.app',
        medium:
          "On most platforms, you're the product. Your data is sold. Your reach is throttled.\n\nOn SportsBlock, you're the owner. Every post lives on the HIVE blockchain — permanent, uncensorable, yours.\n\nsportsblock.app",
        long: "The sports content you create has value. Every match report, every prediction thread, every analysis post.\n\nSportsBlock ensures that value stays with you. Built on the HIVE blockchain — zero transaction fees, permanent storage, true ownership.\n\nNo platform can delete your work. No algorithm can suppress it. It's yours.\n\nsportsblock.app",
      },
      stadium: {
        short:
          'No shadowbans. No deplatforming. No algorithms.\n\nYour posts live on the blockchain. Forever.\n\nsportsblock.app',
        medium:
          'What happens to your content when a platform shuts down? Gone. When they change the TOS? Deleted.\n\nOn SportsBlock, your posts live on the blockchain. Permanent. No one can touch them.\n\nsportsblock.app',
        long: "Platforms have spent years training you to create content they own.\n\nYour match threads? Their content. Your analysis? Their data. Your audience? Their leverage.\n\nSportsBlock breaks that cycle. HIVE blockchain. Zero fees. Every post is cryptographically yours. No corporation sits between you and your audience.\n\nTake back what's yours.\n\nsportsblock.app",
      },
      teal: {
        short:
          'Own what you create.\n\nSportsBlock puts your content on-chain where no one can take it away.\n\nsportsblock.app',
        medium:
          'Built on HIVE blockchain.\nZero transaction fees.\nNo ads, no data harvesting.\nYour content = your property.\n\nThis is what sports social media should have always been.\n\nsportsblock.app',
        long: "Think about how much sports content you've created over the years. Match threads, predictions, takes that went viral.\n\nNone of it is yours. The platforms own every word.\n\nSportsBlock changes that. Your posts live on the HIVE blockchain — you own them, you earn from them, and no one can ever take them away.\n\nsportsblock.app",
      },
      prestige: {
        short:
          'Zero fees. True ownership. Built on HIVE.\n\nSportsBlock is the sports platform web3 deserves.\n\nsportsblock.app',
        medium:
          'Every word you write on SportsBlock is permanently yours.\n\nStored on the HIVE blockchain. No algorithm suppression. No shadow bans. No platform risk. Just your words, owned by you, forever.\n\nsportsblock.app',
        long: "Right now, some platform is selling your sports content to advertisers.\n\nYou're getting zero in return.\n\nSportsBlock is built on HIVE — a blockchain with zero transaction fees. Your posts are permanently stored, cryptographically owned by you, and earn you MEDALS.\n\nStop being the product. Start being the owner.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // PREDICTIONS
  // =========================================================================
  predictions: {
    'prediction-card': {
      void: {
        short:
          'The smart money is on SportsBlock Prediction Bites.\n\nStake. Predict. Earn.\n\nsportsblock.app',
        medium:
          "The data says one thing. The pundits say another. You've done your analysis.\n\nBack your conviction with MEDALS on SportsBlock. Prediction Bites reward those who do the work.\n\nsportsblock.app",
        long: 'Everyone has opinions. Few have the conviction to stake on them.\n\nSportsBlock Prediction Bites separate the analysts from the armchair fans. Stake MEDALS on your prediction. Build a verifiable track record. Earn rewards when your research pays off.\n\nThe sharpest sports minds are already here.\n\nsportsblock.app',
      },
      stadium: {
        short:
          'You called it. Now prove it.\n\nStake MEDALS on SportsBlock Prediction Bites.\n\nsportsblock.app',
        medium:
          'No bookie. No house edge. No vig.\n\nSportsBlock Prediction Bites are peer-to-peer. Stake MEDALS against other fans. Correct predictions take the pool. That simple.\n\nsportsblock.app',
        long: 'The prediction market is broken. Bookmakers set odds to guarantee their profit, not to reward your knowledge.\n\nSportsBlock flips the model. Prediction Bites are pure peer-to-peer. Stake MEDALS on any outcome. The pool belongs to the fans. Correct callers split everything.\n\nNo house. No edge. No middleman.\n\nsportsblock.app',
      },
      teal: {
        short:
          'Lock in your prediction. Stake your MEDALS.\n\nSportsBlock — where knowledge pays.\n\nsportsblock.app',
        medium:
          "Your mate reckons it's a draw. You're backing the underdog.\n\nOn SportsBlock, you both stake MEDALS on your call. Whoever's right earns the pool. It's prediction markets made for friends.\n\nsportsblock.app",
        long: 'Remember arguing with your mates about the weekend\'s results? Everyone claiming they "definitely" called it?\n\nSportsBlock Prediction Bites settle those arguments permanently. Stake MEDALS before kickoff. Predictions are locked on-chain. When the final whistle blows, the smart call earns the rewards.\n\nNo more debates. Just receipts.\n\nsportsblock.app',
      },
      prestige: {
        short:
          'Kickoff in hours. Predictions closing.\n\nStake MEDALS on SportsBlock now or miss out.\n\nsportsblock.app',
        medium:
          "The pool is growing. Predictions are locked. The match is almost here.\n\nIf you're not staking MEDALS on SportsBlock Prediction Bites, you're leaving rewards on the table. Back your call.\n\nsportsblock.app",
        long: "Prediction Bites are heating up and the biggest match of the week hasn't even kicked off yet.\n\nFans are staking MEDALS. The pool is growing by the minute. Every correct prediction splits the pot.\n\nYou already know the result. You've felt it all week. Back yourself before it's too late.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // IPL CONTEST
  // =========================================================================
  'ipl-contest': {
    'contest-card': {
      void: {
        short:
          'IPL Prediction Contest is LIVE.\n\nPredict every match. Win 10,000 MEDALS. Free entry.\n\nsportsblock.app',
        medium:
          'The IPL 2026 Prediction Contest has landed on SportsBlock.\n\nPredict every match. Climb the leaderboard. The sharpest cricket mind walks away with 10,000 MEDALS.\n\nFree to enter. Zero catch.\n\nsportsblock.app',
        long: "The biggest T20 league in the world meets the smartest prediction platform.\n\nSportsBlock's IPL 2026 Prediction Contest is live. Predict every match — winner, top scorer, total runs. The leaderboard tracks your accuracy across the entire tournament.\n\nTop predictor wins 10,000 MEDALS. Free entry. No stake required.\n\nYou already watch every ball. Now prove you know what's coming.\n\nsportsblock.app",
      },
      stadium: {
        short:
          'Think you know cricket better than everyone?\n\nProve it. IPL Contest on SportsBlock. Free entry.\n\nsportsblock.app',
        medium:
          "Everyone's a cricket expert during IPL season.\n\nSportsBlock separates the analysts from the armchair pundits. Predict every IPL 2026 match. Leaderboard tracks everything. 10,000 MEDALS to the top predictor.\n\nFree entry. Back yourself.\n\nsportsblock.app",
        long: 'Your group chat thinks they know cricket. Your timeline is full of "experts."\n\nSportsBlock\'s IPL Prediction Contest settles it. Predict every match of IPL 2026. Your calls are on-chain — no backdating, no hiding wrong picks.\n\nThe leaderboard is public. The top predictor earns 10,000 MEDALS.\n\nFree to enter. The only thing you\'re staking is your reputation.\n\nsportsblock.app',
      },
      teal: {
        short:
          'IPL season + SportsBlock = MEDALS.\n\nFree prediction contest. 10,000 MEDALS prize.\n\nsportsblock.app',
        medium:
          'IPL 2026 is here and SportsBlock is running a free prediction contest for the entire tournament.\n\nPredict every match. Top the leaderboard. Win 10,000 MEDALS.\n\nNo entry fee. No catch. Just your cricket brain vs everyone else.\n\nsportsblock.app',
        long: "CSK or MI? Will Kohli fire? Can Gujarat defend?\n\nYou already have opinions on every IPL match. SportsBlock's IPL Prediction Contest lets you turn those opinions into a track record — and 10,000 MEDALS if you top the leaderboard.\n\nPredict every match. Free entry. The whole tournament. Just you vs the cricket world.\n\nsportsblock.app",
      },
      prestige: {
        short:
          '10,000 MEDALS on the line.\n\nIPL Prediction Contest. Free entry. SportsBlock.\n\nsportsblock.app',
        medium:
          'The IPL Prediction Contest prize pool: 10,000 MEDALS.\n\nThe entry fee: zero.\n\nPredict every IPL 2026 match on SportsBlock. Climb the leaderboard. The sharpest cricket mind takes the pot.\n\nsportsblock.app',
        long: "10,000 MEDALS. That's the prize for the top predictor in SportsBlock's IPL 2026 contest.\n\nFree entry. Every match counts. Every correct call pushes you up the leaderboard.\n\nThis isn't a lottery — it rewards knowledge, consistency, and conviction. The best cricket brain on SportsBlock walks away with 10,000 MEDALS.\n\nIPL starts soon. Your contest starts now.\n\nsportsblock.app",
      },
    },
    'social-post': {
      void: {
        short:
          'IPL Prediction Contest — LIVE on SportsBlock.\n\nFree entry. 10,000 MEDALS to win.\n\nsportsblock.app',
        medium:
          'SportsBlock just launched the IPL 2026 Prediction Contest.\n\nPredict every match. Track your accuracy on the leaderboard. Top predictor wins 10,000 MEDALS. Completely free to enter.\n\nsportsblock.app',
        long: 'IPL 2026 starts soon and SportsBlock has launched the ultimate cricket prediction contest.\n\nPredict every match of the tournament — match winner, top performers, key moments. The leaderboard tracks your accuracy from game one to the final.\n\n10,000 MEDALS to the top predictor. Free entry. No stake required.\n\nThis is your chance to prove you know cricket better than anyone.\n\nsportsblock.app',
      },
      stadium: {
        short:
          'IPL starts. Your predictions start now.\n\nJoin the free contest on SportsBlock.\n\nsportsblock.app',
        medium:
          "The IPL is the biggest T20 event on earth. SportsBlock's prediction contest matches it.\n\nPredict every game. Earn your spot on the leaderboard. Win 10,000 MEDALS.\n\nFree entry. Let your cricket knowledge do the talking.\n\nsportsblock.app",
        long: 'IPL 2026. 74 matches. One leaderboard. One champion.\n\nSportsBlock\'s IPL Prediction Contest is live. Every match, make your call. The leaderboard is public, on-chain, and permanent.\n\nNo backtracking. No "I knew it" without proof. Just predictions that count.\n\n10,000 MEDALS prize. Free to enter.\n\nsportsblock.app',
      },
      teal: {
        short:
          'Free IPL contest on SportsBlock.\n\nPredict. Climb. Win 10,000 MEDALS.\n\nsportsblock.app',
        medium:
          'Love IPL? Love predictions? This is your contest.\n\nSportsBlock is running a free prediction contest for the entire IPL 2026 season. Every match. One leaderboard. 10,000 MEDALS to the winner.\n\nsportsblock.app',
        long: "Every IPL season, millions of fans claim they called every result.\n\nThis year, prove it. SportsBlock's free IPL Prediction Contest tracks your calls across every match. No hiding bad picks. No deleting wrong calls.\n\nTop of the leaderboard wins 10,000 MEDALS. Entry is free.\n\nStop talking. Start predicting.\n\nsportsblock.app",
      },
      prestige: {
        short:
          "IPL + SportsBlock = your biggest contest yet.\n\n10,000 MEDALS. Free entry. Let's go.\n\nsportsblock.app",
        medium:
          '10,000 MEDALS are waiting for the sharpest cricket mind on SportsBlock.\n\nIPL 2026 Prediction Contest. Every match. Free entry. One champion.\n\nAre you in?\n\nsportsblock.app',
        long: "This is the one.\n\nSportsBlock's IPL 2026 Prediction Contest. 10,000 MEDALS prize pool. Free entry. Every single match of the tournament.\n\nYour predictions go on-chain. The leaderboard is live. The entire SportsBlock community is competing.\n\nIf you know cricket — really know it — this is where you prove it.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // MASTERS CONTEST
  // =========================================================================
  'masters-contest': {
    'contest-card': {
      void: {
        short:
          'Masters Prediction Contest — LIVE.\n\nPick the winner. Win 5,000 MEDALS. Free entry.\n\nsportsblock.app',
        medium:
          'The Masters 2026 Prediction Contest is live on SportsBlock.\n\nPick the tournament winner, predict cut makers, call the final round leader. Most accurate predictions win 5,000 MEDALS.\n\nFree to enter.\n\nsportsblock.app',
        long: "Augusta National. Four rounds. One green jacket.\n\nSportsBlock's Masters 2026 Prediction Contest is live. Predict the winner, top 5, cut line, and key matchups across all four rounds.\n\nThe most accurate golf mind on SportsBlock wins 5,000 MEDALS. Free entry. No catch.\n\nYou watch every shot already. Now prove you can call them.\n\nsportsblock.app",
      },
      stadium: {
        short:
          "Who's winning the green jacket?\n\nBack your pick. Masters Contest on SportsBlock.\n\nsportsblock.app",
        medium:
          "Everyone picks Scottie. Everyone picks Rory.\n\nSportsBlock's Masters Contest rewards the sharpest golf brain — not the most obvious pick. Predict the entire tournament. 5,000 MEDALS to the top predictor.\n\nFree entry. Prove your edge.\n\nsportsblock.app",
        long: "Your mate says Scheffler. Your dad says McIlroy. The algorithm says Rahm.\n\nSportsBlock's Masters Prediction Contest settles it with data. Predict the winner, top finishers, and key round matchups. Your calls are on the blockchain — permanent, verifiable.\n\n5,000 MEDALS to the top predictor. Free entry.\n\nDon't just watch Augusta — compete.\n\nsportsblock.app",
      },
      teal: {
        short:
          'Masters 2026 + SportsBlock = free prediction contest.\n\n5,000 MEDALS prize. Enter now.\n\nsportsblock.app',
        medium:
          "The Masters is the most prestigious event in golf. SportsBlock's prediction contest matches the occasion.\n\nPick the winner. Call the cut. Predict round leaders. 5,000 MEDALS to the sharpest golf mind.\n\nFree to enter.\n\nsportsblock.app",
        long: 'Four days at Augusta. Amen Corner. The back nine on Sunday.\n\nSportsBlock is running a free prediction contest for the entire Masters 2026. Winner predictions, top 5, round leaders, and cut line calls.\n\nEvery prediction is tracked. The leaderboard is live. 5,000 MEDALS to the champion.\n\nYou know golf. Prove it.\n\nsportsblock.app',
      },
      prestige: {
        short:
          "5,000 MEDALS. The Masters. Free entry.\n\nSportsBlock Prediction Contest. Let's go.\n\nsportsblock.app",
        medium:
          '5,000 MEDALS for the best golf predictions on SportsBlock.\n\nMasters 2026 Prediction Contest. Pick the winner. Call the narrative. Free entry. One champion.\n\nsportsblock.app',
        long: "The green jacket goes to one player. The 5,000 MEDALS go to one predictor.\n\nSportsBlock's Masters 2026 Prediction Contest. Free entry. Predict the winner, top finishers, round leaders, and key outcomes.\n\nYour picks are on-chain. The leaderboard is public. The golf world is watching.\n\nIf you know Augusta — really know it — this is your week.\n\nsportsblock.app",
      },
    },
    'social-post': {
      void: {
        short:
          'Masters Prediction Contest on SportsBlock.\n\nFree entry. 5,000 MEDALS prize.\n\nsportsblock.app',
        medium:
          'SportsBlock is running a free prediction contest for the Masters 2026.\n\nPick the winner. Call the cut line. Predict round leaders. Most accurate predictor wins 5,000 MEDALS.\n\nsportsblock.app',
        long: "The Masters 2026 is almost here. SportsBlock's prediction contest is already live.\n\nPredict the tournament winner, top 5 finishers, cut makers, and round-by-round leaders. Every prediction tracked. Leaderboard updated live.\n\n5,000 MEDALS to the champion. Free to enter.\n\nAugusta waits for no one. Neither does the leaderboard.\n\nsportsblock.app",
      },
      stadium: {
        short:
          'Augusta calls. So do 5,000 MEDALS.\n\nFree Masters contest on SportsBlock.\n\nsportsblock.app',
        medium:
          "It's Masters week. SportsBlock's prediction contest is your chance to prove you know golf better than the pundits.\n\n5,000 MEDALS. Free entry. Every pick counts.\n\nsportsblock.app",
        long: "Every year, millions of fans fill out Masters brackets and forget about them.\n\nSportsBlock is different. Predictions are on-chain. The leaderboard is live. Every round matters.\n\n5,000 MEDALS to the most accurate predictor. Free entry.\n\nThis isn't a bracket pool — it's a proving ground.\n\nsportsblock.app",
      },
      teal: {
        short:
          'Free Masters prediction contest.\n\nPick. Predict. Win 5,000 MEDALS.\n\nsportsblock.app',
        medium:
          "Love golf? Love predictions? SportsBlock's Masters 2026 contest is for you.\n\nFree entry. 5,000 MEDALS to the winner. Predictions tracked on-chain.\n\nsportsblock.app",
        long: "Amen Corner. The Sunday back nine. The roars.\n\nSportsBlock's Masters 2026 Prediction Contest captures every moment. Predict winners, top finishers, and round leaders. The leaderboard is live all week.\n\n5,000 MEDALS prize. Free entry. Just your golf knowledge vs the world.\n\nsportsblock.app",
      },
      prestige: {
        short:
          'Masters week. 5,000 MEDALS. Free entry.\n\nSportsBlock Prediction Contest is live.\n\nsportsblock.app',
        medium:
          'The most prestigious tournament in golf. The most rewarding prediction contest on SportsBlock.\n\n5,000 MEDALS. Free entry. One leaderboard. One champion.\n\nsportsblock.app',
        long: "SportsBlock's Masters 2026 Prediction Contest. 5,000 MEDALS prize.\n\nPredict the green jacket winner. Call the top 5. Nail the cut line. Every prediction on-chain. Leaderboard live from Thursday to Sunday.\n\nFree entry. This is the golf prediction event of the year.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // SPORTSBITES — short hot takes paired with sportsbite brand cards
  // =========================================================================
  sportsbites: {
    'social-post': {
      void: {
        short:
          'Your hot take. 280 characters. Real MEDALS.\n\nSportsbites on SportsBlock.\n\nsportsblock.app',
        medium:
          'Sportsbites are the fastest way to earn on SportsBlock.\n\nDrop a hot take. The community votes. If it hits, you earn MEDALS. Quick, sharp, rewarded.\n\nsportsblock.app',
        long: 'Not every sports opinion needs a 2,000-word essay.\n\nSportsbites on SportsBlock are quick-fire hot takes — a sentence, a stat, a bold call. The community votes on the sharpest ones, and the best takes earn MEDALS.\n\nYour best take might be your shortest one. Drop a sportsbite.\n\nsportsblock.app',
      },
      stadium: {
        short:
          'Quick take. Quick MEDALS.\n\nSportsbites on SportsBlock. Drop yours now.\n\nsportsblock.app',
        medium:
          'Twitter gave you likes. SportsBlock gives you MEDALS.\n\nSportsbites are the fastest content format on the platform — hot takes that earn real crypto when the community rates them.\n\nsportsblock.app',
        long: 'Your best sports take is already in your head.\n\nSportsbites on SportsBlock turn that thought into earned crypto. Post it. The community votes. The best takes climb. MEDALS flow.\n\nNo essay required. No character minimum. Just the take.\n\nsportsblock.app',
      },
      teal: {
        short: 'Sportsbites: hot takes that earn MEDALS.\n\nJoin SportsBlock.\n\nsportsblock.app',
        medium:
          "Drop a sportsbite on SportsBlock. It's the easiest way to start earning.\n\nOne hot take. Community votes. MEDALS earned. That simple.\n\nsportsblock.app",
        long: "Every fan has that one take they're dying to share during the match.\n\nSportsbites on SportsBlock are built for exactly that moment. Quick-fire takes that earn MEDALS based on community engagement.\n\nThe spicier the take, the higher it climbs. Drop your first sportsbite.\n\nsportsblock.app",
      },
      prestige: {
        short:
          'The spiciest takes earn the most MEDALS.\n\nSportsbites on SportsBlock.\n\nsportsblock.app',
        medium:
          "Your hottest take is worth real crypto on SportsBlock.\n\nSportsbites — quick-fire content that earns MEDALS. The sharper the take, the bigger the reward. What's your call?\n\nsportsblock.app",
        long: "Match day. Your timeline is exploding. You've got the take no one else is brave enough to post.\n\nSportsBlock Sportsbites reward boldness. Drop your hot take. The community rates it. If it hits — MEDALS.\n\nThe best take on match day earns the most. Post yours before kickoff.\n\nsportsblock.app",
      },
    },
  },

  // =========================================================================
  // LONG-FORM — analysis threads and deep dives
  // =========================================================================
  longform: {
    'social-post': {
      void: {
        short:
          'Deep analysis. Real rewards.\n\nLong-form sports writing earns MEDALS on SportsBlock.\n\nsportsblock.app',
        medium:
          "SportsBlock isn't just hot takes — it rewards deep analysis too.\n\nWrite a match preview. Break down tactics. Analyse the transfer window. Every piece of quality long-form content earns MEDALS.\n\nsportsblock.app",
        long: 'The best sports writing on the internet earns nothing for the author.\n\nSportsBlock changes that. Write in-depth match previews, tactical breakdowns, season analysis — real long-form content. The community rewards quality with MEDALS.\n\nYour best analysis deserves more than a like. It deserves earnings.\n\nsportsblock.app',
      },
      stadium: {
        short:
          'Sports writers deserve to get paid.\n\nLong-form content earns MEDALS on SportsBlock.\n\nsportsblock.app',
        medium:
          'You spend hours on that match preview. Researching stats. Watching film. Crafting the narrative.\n\nOn SportsBlock, that effort earns MEDALS. Long-form sports writing has a home that actually pays.\n\nsportsblock.app',
        long: 'Medium pays writers in exposure. Substack takes a cut. Twitter gives you zero.\n\nSportsBlock pays you directly in MEDALS for every piece of sports content you publish. Match previews. Tactical analysis. Season reviews. Transfer deep dives.\n\nThe deeper the analysis, the more the community rewards it.\n\nYour words. Your MEDALS. Zero fees.\n\nsportsblock.app',
      },
      teal: {
        short:
          'Long reads. Long rewards.\n\nSportsBlock pays for quality sports analysis.\n\nsportsblock.app',
        medium:
          'If you\'ve ever written a match preview and thought "this should earn me something" — SportsBlock agrees.\n\nLong-form sports content earns MEDALS. The community votes. Quality rises.\n\nsportsblock.app',
        long: 'Some fans write threads that should be articles. Match previews with stats. Tactical breakdowns with heat maps. Transfer analysis that rivals the professionals.\n\nSportsBlock rewards that effort. Publish long-form content. Earn MEDALS. Build a reputation as a serious sports analyst.\n\nYour best work deserves real rewards.\n\nsportsblock.app',
      },
      prestige: {
        short:
          'Your analysis is worth MEDALS.\n\nPublish on SportsBlock. Earn for real.\n\nsportsblock.app',
        medium:
          'The best sports analysts on X give away millions of words for free every year.\n\nSportsBlock pays for every one. Long-form analysis. Match reports. Tactical breakdowns. All earning MEDALS.\n\nsportsblock.app',
        long: 'You wrote a 2,000-word match preview. You analysed the stats. You built the narrative.\n\nOn Twitter, that gets 47 likes and disappears. On SportsBlock, it earns MEDALS — real crypto that rewards the depth of your analysis.\n\nThe community votes. Quality content climbs. Your best work earns the most.\n\nStop writing for free.\n\nsportsblock.app',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with commas)
// ---------------------------------------------------------------------------

function* parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.length > 0 || lines.length > 0) {
        lines.push(current);
        current = '';
      }
      if (lines.length > 0) {
        yield lines.splice(0);
      }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || lines.length > 0) {
    lines.push(current);
    yield lines.splice(0);
  }
}

function readCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rows = [];
  let headers = null;

  for (const fields of parseCSV(text)) {
    if (!headers) {
      headers = fields.map((h) => h.trim());
      continue;
    }
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (fields[i] || '').trim();
    });
    rows.push(obj);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Tweet lookup + hashtag attachment
// ---------------------------------------------------------------------------

function getTweet(ctaId, template, theme, length) {
  return tweets[ctaId]?.[template]?.[theme]?.[length] || '';
}

function addHashtags(tweet, ctaId) {
  const count = tweet.length < 120 ? 4 : 3;
  const tags = pickHashtags(ctaId, count);
  const full = tweet + '\n\n' + tags;
  if (full.length <= 280) return full;
  const tagList = tags.split(' ');
  for (let n = tagList.length - 1; n >= 1; n--) {
    const shorter = tweet + '\n\n' + tagList.slice(0, n).join(' ');
    if (shorter.length <= 280) return shorter;
  }
  return tweet;
}

// ---------------------------------------------------------------------------
// Image path helper — matches Figma export naming
// ---------------------------------------------------------------------------

function imageName(row) {
  const templateNames = {
    'social-post': 'Social Post',
    'prediction-card': 'Prediction Card',
    'contest-card': 'Contest Card',
    instagram: 'Instagram',
    story: 'Story',
  };
  const ctaNames = {
    earn: 'Earn',
    community: 'Community',
    ownership: 'Ownership',
    predictions: 'Predictions',
    'ipl-contest': 'IPL Contest',
    'masters-contest': 'Masters Contest',
    sportsbites: 'Sportsbites',
    longform: 'Long Form',
  };
  const t = templateNames[row.template] || row.template;
  const th = THEME_LABELS[row.theme] || row.theme;
  const c = ctaNames[row.cta_id] || row.cta_id;
  return `${t} \u2014 ${th} \u2014 _${c}_.png`;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

function generateSchedule(count) {
  const dates = [];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(0, 0, 0, 0);

  let dayOffset = 0;
  let timeIdx = 0;

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + dayOffset);

    const [h, m] = POST_TIMES[timeIdx].split(':');
    d.setUTCHours(parseInt(h), parseInt(m), 0, 0);

    dates.push(d);

    timeIdx++;
    if (timeIdx >= POST_TIMES.length) {
      timeIdx = 0;
      dayOffset++;
    }
  }

  return dates;
}

function formatDate(d) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Reading CSV...');
  const rows = readCSV(CSV_PATH);
  console.log(`  Found ${rows.length} total rows`);

  // Filter to Twitter/X targeted rows (all card types for X)
  const validTemplates = ['social-post', 'prediction-card', 'contest-card'];
  const xRows = rows.filter((r) => {
    const target = (r.platform_target || '').toLowerCase();
    const template = (r.template || '').toLowerCase();
    return target.includes('twitter') && validTemplates.includes(template);
  });
  console.log(`  Filtered to ${xRows.length} Twitter/X rows`);

  // Generate 3 variants per row
  const variants = [];
  const seenTexts = new Set();

  for (const row of xRows) {
    for (const length of ['short', 'medium', 'long']) {
      const rawTweet = getTweet(row.cta_id, row.template, row.theme, length);
      if (!rawTweet) {
        // Try falling back to social-post template for the same cta/theme
        const fallback = getTweet(row.cta_id, 'social-post', row.theme, length);
        if (!fallback) {
          console.warn(
            `  WARNING: Missing tweet for ${row.cta_id}/${row.template}/${row.theme}/${length}`
          );
          continue;
        }
      }

      const tweet = addHashtags(
        rawTweet || getTweet(row.cta_id, 'social-post', row.theme, length),
        row.cta_id
      );
      if (seenTexts.has(tweet)) continue; // skip exact dupes
      seenTexts.add(tweet);

      variants.push({
        text: tweet,
        imagePath: `${ASSETS_DIR}/${imageName(row)}`,
        ctaAngle: row.cta_angle || row.cta_id,
        ctaId: row.cta_id,
        theme: row.theme,
        template: row.template,
        length,
      });
    }
  }
  console.log(`  Generated ${variants.length} tweet variants (${seenTexts.size} unique)`);

  // Assign schedule dates
  const dates = generateSchedule(variants.length);

  // ---------------------------------------------------------------------------
  // Write Buffer CSV
  // ---------------------------------------------------------------------------

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const csvHeader = 'Text,Image Path,Scheduled Date,Campaign Tag';
  const csvRows = variants.map((v, i) => {
    const text = '"' + v.text.replace(/"/g, '""') + '"';
    const date = formatDate(dates[i]);
    const tag = v.ctaAngle;
    return `${text},${v.imagePath},${date},${tag}`;
  });

  fs.writeFileSync(BUFFER_CSV_PATH, [csvHeader, ...csvRows].join('\n'), 'utf-8');
  console.log(`\nWrote Buffer CSV: ${BUFFER_CSV_PATH}`);
  console.log(`  ${csvRows.length} scheduled posts over ${Math.ceil(csvRows.length / 3)} days`);

  // ---------------------------------------------------------------------------
  // Write tweet-copy.md
  // ---------------------------------------------------------------------------

  const ctaOrder = [
    'earn',
    'community',
    'ownership',
    'predictions',
    'ipl-contest',
    'masters-contest',
    'sportsbites',
    'longform',
  ];
  const ctaLabels = {
    earn: 'Earn Rewards',
    community: 'Pure Community',
    ownership: 'True Ownership',
    predictions: 'Prediction Bites',
    'ipl-contest': 'IPL 2026 Prediction Contest',
    'masters-contest': 'Masters 2026 Prediction Contest',
    sportsbites: 'Sportsbites',
    longform: 'Long-Form Analysis',
  };

  let md = '# SportsBlock X/Twitter Tweet Copy\n\n';
  md += `> Generated ${new Date().toISOString().split('T')[0]} | ${variants.length} tweets across ${ctaOrder.length} content types | ALL UNIQUE\n\n`;
  md += '---\n\n';

  for (const ctaId of ctaOrder) {
    const ctaVariants = variants.filter((v) => v.ctaId === ctaId);
    if (ctaVariants.length === 0) continue;

    md += `## ${ctaLabels[ctaId] || ctaId}\n\n`;

    const groups = {};
    for (const v of ctaVariants) {
      const key = `${v.theme}-${v.template}`;
      if (!groups[key]) groups[key] = { theme: v.theme, template: v.template, tweets: {} };
      groups[key].tweets[v.length] = v.text;
    }

    const themeOrder = ['void', 'stadium', 'teal', 'prestige'];
    const templateOrder = ['social-post', 'prediction-card', 'contest-card'];

    for (const theme of themeOrder) {
      for (const template of templateOrder) {
        const key = `${theme}-${template}`;
        const g = groups[key];
        if (!g) continue;

        const templateLabel =
          {
            'social-post': 'Social Post',
            'prediction-card': 'Prediction Card',
            'contest-card': 'Contest Card',
          }[g.template] || g.template;
        const themeLabel = THEME_LABELS[g.theme] || g.theme;
        md += `### ${themeLabel} \u2014 ${templateLabel}\n\n`;

        for (const length of ['short', 'medium', 'long']) {
          if (g.tweets[length]) {
            md += `**${length.charAt(0).toUpperCase() + length.slice(1)}:**\n\n`;
            md += '```\n' + g.tweets[length] + '\n```\n\n';
          }
        }
      }
    }

    md += '---\n\n';
  }

  fs.writeFileSync(TWEET_COPY_PATH, md, 'utf-8');
  console.log(`Wrote tweet copy: ${TWEET_COPY_PATH}`);

  console.log('\nDone! Next steps:');
  console.log('  1. Export Figma designs as PNGs to marketing/assets/');
  console.log('     Naming: "Social Post — Void — _Earn_.png"');
  console.log('     Naming: "Contest Card — Stadium — _IPL Contest_.png"');
  console.log('  2. Import buffer-schedule.csv into Buffer');
  console.log('  3. Review and tweak any tweets you want to personalise');
}

main();
