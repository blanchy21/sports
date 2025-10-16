import { Client } from '@hiveio/dhive';
import { HiveAccount, HivePost, HiveComment, HiveResourceCredit } from './types';

// Hive node endpoints - using most reliable nodes first
const HIVE_NODES = [
  'https://api.hive.blog',           // @blocktrades - most reliable
  'https://api.openhive.network',    // @gtg - established node
  'https://hive-api.arcange.eu',     // @arcange - reliable European node
  'https://api.deathwing.me',        // @deathwing - backup node
  'https://api.c0ff33a.uk'           // @c0ff33a - backup node
];

// Additional nodes to test (commented out until verified)
const ADDITIONAL_NODES = [
  'https://anyx.io',                 // @anyx - very fast and reliable
  'https://rpc.ausbit.dev',          // @ausbitbank - community favorite
  'https://rpc.mahdiyari.info',      // @mahdiyari - fast response times
  'https://api.hive.blue',           // @guiltyparties - good performance
  'https://techcoderx.com',          // @techcoderx - reliable node
  'https://hive.roelandp.nl'         // @roelandp - European node
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
      timeout: 15000, // 15 seconds for better reliability
      failoverThreshold: 2, // Switch nodes after 2 failures
      consoleOnFailover: true,
      retries: 3, // Retry failed requests
      retryDelay: 1000, // 1 second delay between retries
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
    timeout: 15000, // 15 seconds for better reliability
    failoverThreshold: 2, // Switch nodes after 2 failures
    consoleOnFailover: true,
    retries: 3, // Retry failed requests
    retryDelay: 1000, // 1 second delay between retries
  });
}

// Check if Hive node is responsive
export async function checkNodeHealth(node: string): Promise<boolean> {
  try {
    console.log(`[checkNodeHealth] Testing node: ${node}`);
    const client = createHiveClient(node);
    
    // Test with a simple API call
    const result = await client.database.getDynamicGlobalProperties();
    console.log(`[checkNodeHealth] Node ${node} is responsive:`, !!result);
    return true;
  } catch (error) {
    console.warn(`[checkNodeHealth] Node ${node} is not responsive:`, error.message);
    return false;
  }
}

// Test a specific node with detailed debugging
export async function testNodeDetailed(node: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  try {
    console.log(`[testNodeDetailed] Testing ${node}...`);
    const client = createHiveClient(node);
    
    // Test basic connectivity
    const props = await client.database.getDynamicGlobalProperties();
    console.log(`[testNodeDetailed] Basic connectivity OK:`, !!props);
    
    // Test account lookup
    const accounts = await client.database.getAccounts(['blanchy']);
    console.log(`[testNodeDetailed] Account lookup OK:`, accounts.length > 0);
    
    const responseTime = Date.now() - startTime;
    return { success: true, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[testNodeDetailed] ${node} failed:`, error.message);
    return { success: false, error: error.message, responseTime };
  }
}

// Get the best available Hive node based on performance
export async function getBestHiveNode(): Promise<string> {
  console.log(`[getBestHiveNode] Testing ${HIVE_NODES.length} nodes for performance...`);
  
  const performanceTests = await Promise.allSettled(
    HIVE_NODES.map(async (node) => {
      const startTime = Date.now();
      try {
        await checkNodeHealth(node);
        const responseTime = Date.now() - startTime;
        return { node, responseTime, healthy: true };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return { node, responseTime, healthy: false };
      }
    })
  );
  
  const results = performanceTests
    .map((result) => result.status === 'fulfilled' ? result.value : null)
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .filter(result => result.healthy)
    .sort((a, b) => a.responseTime - b.responseTime);
  
  const bestNode = results[0]?.node || HIVE_NODES[0];
  console.log(`[getBestHiveNode] Best node: ${bestNode} (${results[0]?.responseTime}ms)`);
  
  return bestNode;
}

// Test additional nodes and return working ones
export async function testAdditionalNodes(): Promise<string[]> {
  console.log(`[testAdditionalNodes] Testing ${ADDITIONAL_NODES.length} additional nodes...`);
  
  const workingNodes: string[] = [];
  
  for (const node of ADDITIONAL_NODES) {
    const result = await testNodeDetailed(node);
    if (result.success) {
      workingNodes.push(node);
      console.log(`[testAdditionalNodes] ✅ ${node} is working (${result.responseTime}ms)`);
    } else {
      console.log(`[testAdditionalNodes] ❌ ${node} failed: ${result.error}`);
    }
  }
  
  return workingNodes;
}

// Debug function to test all nodes (can be called from browser console)
export async function debugAllNodes(): Promise<void> {
  console.log('🔍 Testing all Hive nodes...');
  
  // Test primary nodes
  console.log('\n📋 Testing primary nodes:');
  for (const node of HIVE_NODES) {
    const result = await testNodeDetailed(node);
    console.log(`${result.success ? '✅' : '❌'} ${node}: ${result.success ? `${result.responseTime}ms` : result.error}`);
  }
  
  // Test additional nodes
  console.log('\n📋 Testing additional nodes:');
  for (const node of ADDITIONAL_NODES) {
    const result = await testNodeDetailed(node);
    console.log(`${result.success ? '✅' : '❌'} ${node}: ${result.success ? `${result.responseTime}ms` : result.error}`);
  }
  
  console.log('\n✅ Node testing complete!');
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

// Make debug function available globally for testing
if (typeof window !== 'undefined') {
  (window as any).debugHiveNodes = debugAllNodes;
  (window as any).testHiveNode = testNodeDetailed;
}

// Utility functions for common operations
export async function getAccountInfo(username: string): Promise<HiveAccount | null> {
  console.log(`[getAccountInfo] Fetching account info for: ${username}`);
  
  // Try each node individually for better reliability
  for (let i = 0; i < HIVE_NODES.length; i++) {
    const node = HIVE_NODES[i];
    try {
      console.log(`[getAccountInfo] Trying node ${i + 1}/${HIVE_NODES.length}: ${node}`);
      const client = createHiveClient(node);
      console.log(`[getAccountInfo] Client created, calling getAccounts...`);
      
      // Add a timeout wrapper for the getAccounts call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('getAccounts timeout after 10 seconds')), 10000);
      });
      
      const getAccountsPromise = client.database.getAccounts([username]);
      
      const accounts = await Promise.race([getAccountsPromise, timeoutPromise]) as any[];
      console.log(`[getAccountInfo] Received ${accounts.length} accounts from ${node}`);
      
      if (accounts.length > 0) {
        console.log(`[getAccountInfo] Success! Account data:`, accounts[0]);
        return (accounts[0] as unknown as HiveAccount) || null;
      } else {
        console.log(`[getAccountInfo] No accounts found for ${username} on ${node}`);
      }
    } catch (error) {
      console.warn(`[getAccountInfo] Failed with node ${node}:`, error.message);
      console.warn(`[getAccountInfo] Error details:`, error);
      continue;
    }
  }
  
  // If all nodes fail, try a direct HTTP request as fallback
  console.log(`[getAccountInfo] All nodes failed, trying direct HTTP request...`);
  try {
    const response = await fetch('https://api.hive.blog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'database_api.get_accounts',
        params: [[username]],
        id: 1
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[getAccountInfo] Direct HTTP response:`, data);
    
    if (data.result && data.result.length > 0) {
      console.log(`[getAccountInfo] Success with direct HTTP! Account data:`, data.result[0]);
      return data.result[0] as HiveAccount;
    } else {
      console.log(`[getAccountInfo] No account found in HTTP response`);
    }
  } catch (error) {
    console.warn(`[getAccountInfo] Direct HTTP request failed:`, error);
  }
  
  throw new Error(`Failed to fetch account info from all Hive nodes and direct HTTP`);
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

