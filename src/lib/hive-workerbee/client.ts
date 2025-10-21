import WorkerBee from "@hiveio/workerbee";
import type { IStartConfiguration } from "@hiveio/workerbee";
import type { IHiveChainInterface } from "@hiveio/wax";

// Hive node endpoints - using same reliable nodes as current implementation
const HIVE_NODES = [
  'https://api.hive.blog',           // @blocktrades - most reliable
  'https://api.openhive.network',    // @gtg - established node
  'https://hive-api.arcange.eu',     // @arcange - reliable European node
  'https://api.deathwing.me',        // @deathwing - backup node
  'https://api.c0ff33a.uk'           // @c0ff33a - backup node
];

// Sportsblock configuration (same as current implementation)
export const SPORTS_ARENA_CONFIG = {
  APP_NAME: 'sportsblock',
  APP_VERSION: '1.0.0',
  COMMUNITY_ID: 'hive-115814',
  COMMUNITY_NAME: 'sportsblock',
  TAGS: ['sportsblock', 'hive-115814'],
  DEFAULT_BENEFICIARIES: [
    {
      account: 'sportsblock',
      weight: 500 // 5% to platform
    }
  ]
};

// WorkerBee client instance
let workerBeeClient: InstanceType<typeof WorkerBee> | null = null;

/**
 * Get or create WorkerBee client instance
 * @returns WorkerBee client
 */
export function getWorkerBeeClient(): InstanceType<typeof WorkerBee> {
  if (!workerBeeClient) {
    workerBeeClient = new WorkerBee();
  }
  return workerBeeClient;
}

/**
 * Get Wax instance from WorkerBee chain
 * @returns Wax instance
 */
export function getWaxFromWorkerBee(client: InstanceType<typeof WorkerBee>): IHiveChainInterface {
    if (!client.chain) {
      throw new Error('WorkerBee chain not available. Make sure to call initializeWorkerBeeClient() first.');
    }
    return client.chain;
}

/**
 * Get WorkerBee client for real-time monitoring
 * @returns WorkerBee client instance
 */
export function getWorkerBeeForMonitoring(): InstanceType<typeof WorkerBee> {
  return getWorkerBeeClient();
}

/**
 * Initialize WorkerBee client and start listening
 * @returns Promise that resolves when client is ready
 */
export async function initializeWorkerBeeClient(): Promise<InstanceType<typeof WorkerBee>> {
  const client = getWorkerBeeClient();
  
  if (!client.running) {
    await client.start();
  }
  
  return client;
}

/**
 * Get Wax instance for building transactions
 * @returns Wax instance
 */
export async function getWaxClient(): Promise<IHiveChainInterface> {
  // Initialize WorkerBee client first, then return the wax instance
  const client = await initializeWorkerBeeClient();
  return getWaxFromWorkerBee(client);
}

/**
 * Check if WorkerBee client is running
 * @returns True if client is started
 */
export function isWorkerBeeStarted(): boolean {
  return workerBeeClient?.running || false;
}

/**
 * Stop WorkerBee client
 */
export async function stopWorkerBeeClient(): Promise<void> {
  if (workerBeeClient && workerBeeClient.running) {
    await workerBeeClient.stop();
    console.log('WorkerBee client stopped');
  }
}

/**
 * Get Hive node endpoints for configuration
 * @returns Array of Hive node URLs
 */
export function getHiveNodes(): string[] {
  return [...HIVE_NODES];
}

/**
 * Create a new WorkerBee client with specific configuration
 * @param options - WorkerBee configuration options
 * @returns New WorkerBee client
 */
export function createWorkerBeeClient(options?: IStartConfiguration): InstanceType<typeof WorkerBee> {
  return new WorkerBee(options);
}

// Export the main client instance (lazy initialization)
export const workerBee = getWorkerBeeClient();
