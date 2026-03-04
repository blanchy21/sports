/**
 * Platform configuration constants.
 * Leaf module — no internal imports.
 */

export const SPORTS_ARENA_CONFIG = {
  APP_NAME: 'sportsblock',
  APP_VERSION: '1.0.0',
  COMMUNITY_ID: 'hive-115814',
  COMMUNITY_NAME: 'sportsblock',
  TAGS: ['sportsblock', 'hive-115814'],
  REWARDS_ACCOUNT: 'sp-blockrewards',
  DEFAULT_BENEFICIARIES: [
    {
      account: 'sportsblock',
      weight: 500, // 5% to platform (per MEDALS whitepaper v4)
    },
  ],
};

// Authors muted at the platform level — their posts and comments are hidden from all feeds.
// Add Hive usernames (without @) to block spam or abusive accounts.
export const MUTED_AUTHORS: readonly string[] = ['kgakakillerg', 'heimindanger'];
