import { Client } from '@hiveio/dhive';
import { HiveAccount, HivePost, HiveComment, HiveResourceCredit } from './types';

// Hive node endpoints - using multiple for reliability
const HIVE_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://api.openhive.network',
  'https://hive-api.arcange.eu',
  'https://api.c0ff33a.uk'
];

// Sportsblock configuration
export const SPORTS_ARENA_CONFIG = {
  APP_NAME: 'sportsblock',
  APP_VERSION: '1.0.0',
  COMMUNITY_ID: 'hive-113896',
  COMMUNITY_NAME: 'sportsblock',
  TAGS: ['sportsblock', 'hive-113896'],
  DEFAULT_BENEFICIARIES: [
    {
      account: 'sportsblock',
      weight: 500 // 5% to platform
    }
  ]
};

// Initialize Hive client
let hiveClient: Client | null = null;

export function getHiveClient(): Client {
  if (!hiveClient) {
    hiveClient = new Client(HIVE_NODES, {
      timeout: 30000,
      failoverThreshold: 5,
      consoleOnFailover: true,
    });
  }
  return hiveClient;
}

// Helper function to get a random node (for load balancing)
export function getRandomHiveNode(): string {
  return HIVE_NODES[Math.floor(Math.random() * HIVE_NODES.length)];
}

// Helper function to create a new client instance with specific node
export function createHiveClient(node?: string): Client {
  const nodes = node ? [node] : HIVE_NODES;
  return new Client(nodes, {
    timeout: 30000,
    failoverThreshold: 5,
    consoleOnFailover: true,
  });
}

// Check if Hive node is responsive
export async function checkNodeHealth(node: string): Promise<boolean> {
  try {
    const client = createHiveClient(node);
    await client.database.getDynamicGlobalProperties();
    return true;
  } catch (error) {
    console.warn(`Node ${node} is not responsive:`, error);
    return false;
  }
}

// Get the best available Hive node
export async function getBestHiveNode(): Promise<string> {
  const healthChecks = await Promise.allSettled(
    HIVE_NODES.map(node => checkNodeHealth(node))
  );

  for (let i = 0; i < healthChecks.length; i++) {
    const result = healthChecks[i];
    if (result.status === 'fulfilled' && result.value) {
      return HIVE_NODES[i];
    }
  }

  // Fallback to first node if all fail
  console.warn('All Hive nodes appear to be down, using fallback');
  return HIVE_NODES[0];
}

// Initialize client with best available node
export async function initializeHiveClient(): Promise<Client> {
  const bestNode = await getBestHiveNode();
  hiveClient = createHiveClient(bestNode);
  console.log(`Hive client initialized with node: ${bestNode}`);
  return hiveClient;
}

// Export the main client instance
export const client = getHiveClient();

// Utility functions for common operations
export async function getAccountInfo(username: string): Promise<HiveAccount | null> {
  try {
    console.log(`[getAccountInfo] Fetching account info for: ${username}`);
    const client = getHiveClient();
    const accounts = await client.database.getAccounts([username]);
    console.log(`[getAccountInfo] Received ${accounts.length} accounts`);
    return (accounts[0] as unknown as HiveAccount) || null;
  } catch (error) {
    console.error('Error fetching account info:', error);
    throw error;
  }
}

export async function getPost(author: string, permlink: string): Promise<HivePost | null> {
  try {
    const client = getHiveClient();
    const posts = await client.database.call('get_content', [author, permlink]);
    return posts || null;
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
}

export async function getComments(author: string, permlink: string, limit = 20): Promise<HiveComment[]> {
  try {
    const client = getHiveClient();
    const comments = await client.database.call('get_content_replies', [author, permlink, limit]);
    return comments || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

export async function getResourceCredits(username: string): Promise<HiveResourceCredit | null> {
  try {
    console.log(`[getResourceCredits] Fetching RC for: ${username}`);
    const client = getHiveClient();
    const rc = await client.rc.call('get_resource_credits', [username]);
    console.log(`[getResourceCredits] Received RC data:`, rc);
    return rc || null;
  } catch (error) {
    console.error('Error fetching resource credits:', error);
    return null;
  }
}

