import WorkerBee from "@hiveio/workerbee";
import type { IStartConfiguration } from "@hiveio/workerbee";
import type { IHiveChainInterface } from "@hiveio/wax";
import { workerBee as workerBeeLog, error as logError } from './logger';

// Hive node endpoints - optimized for reliability and speed
// arcange.eu excluded due to consistent timeout issues in production
const HIVE_NODES = [
  'https://api.hive.blog',           // @blocktrades - most reliable
  'https://api.openhive.network',    // @gtg - established node
  'https://api.deathwing.me',        // @deathwing - backup node
  'https://api.c0ff33a.uk',          // @c0ff33a - backup node
];

// Sportsblock configuration (same as current implementation)
export const SPORTS_ARENA_CONFIG = {
  APP_NAME: 'sportsblock',
  APP_VERSION: '1.0.0',
  COMMUNITY_ID: 'hive-115814',
  COMMUNITY_NAME: 'sportsblock',
  TAGS: ['sportsblock', 'hive-115814'],
  // Account that distributes block rewards to users
  REWARDS_ACCOUNT: 'sp-blockrewards',
  DEFAULT_BENEFICIARIES: [
    {
      account: 'sportsblock',
      weight: 2000 // 20% to platform (per MEDALS whitepaper)
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
 * Enhanced with better error handling and configuration
 * @returns Wax instance
 */
export async function getWaxClient(): Promise<IHiveChainInterface> {
  try {
    workerBeeLog('[Wax Client] Initializing Wax client...');
    
    // Initialize WorkerBee client first, then return the wax instance
    const client = await initializeWorkerBeeClient();
    const wax = getWaxFromWorkerBee(client);
    
    workerBeeLog('[Wax Client] Wax client initialized successfully');
    return wax;
  } catch (error) {
    logError('Failed to initialize Wax client', 'getWaxClient', error instanceof Error ? error : undefined);
    throw new Error(`Failed to initialize Wax client: ${error instanceof Error ? error.message : String(error)}`);
  }
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
    workerBeeLog('WorkerBee client stopped');
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

/**
 * Get Wax configuration options
 * @returns Wax configuration
 */
export function getWaxConfiguration(): {
  nodes: string[];
  timeout: number;
  retries: number;
} {
  return {
    nodes: getHiveNodes(),
    timeout: 30000, // 30 seconds
    retries: 3
  };
}

/**
 * Get Wax protocol information
 * @returns Protocol information
 */
export async function getWaxProtocolInfo(): Promise<{
  version: string;
  chainId: string;
  headBlockNumber: number;
  lastIrreversibleBlockNumber: number;
}> {
  try {
    const wax = await getWaxClient();
    
    // Try to get protocol info using Wax API
    if (wax && typeof (wax as unknown as { call?: (method: string, params: unknown[]) => Promise<unknown> }).call === 'function') {
      const result = await (wax as unknown as { call: (method: string, params: unknown[]) => Promise<unknown> }).call('condenser_api.get_dynamic_global_properties', []) as Record<string, unknown>;
      
      if (result) {
        return {
          version: '1.0.0',
          chainId: (result.chain_id as string) || 'unknown',
          headBlockNumber: (result.head_block_number as number) || 0,
          lastIrreversibleBlockNumber: (result.last_irreversible_block_num as number) || 0
        };
      }
    }
    
    throw new Error('Wax protocol info not available');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Only log if it's not a known requestInterceptor issue
    if (!errorMessage.includes('requestInterceptor') && !errorMessage.includes('temporarily disabled')) {
      logError('Failed to get Wax protocol info', 'getWaxProtocolInfo', error instanceof Error ? error : undefined);
    }
    
    return {
      version: 'unknown',
      chainId: 'unknown',
      headBlockNumber: 0,
      lastIrreversibleBlockNumber: 0
    };
  }
}

/**
 * Check Wax client health
 * @returns Health status
 */
export async function checkWaxHealth(): Promise<{
  isHealthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const wax = await getWaxClient();
    
    // Try a simple API call to check health
    if (wax && typeof (wax as unknown as { call?: (method: string, params: unknown[]) => Promise<unknown> }).call === 'function') {
      await (wax as unknown as { call: (method: string, params: unknown[]) => Promise<unknown> }).call('condenser_api.get_dynamic_global_properties', []);
      const latency = Date.now() - startTime;
      
      return {
        isHealthy: true,
        latency
      };
    }
    
    throw new Error('Wax health check method not available');
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Only include error message if it's not a known requestInterceptor issue
    const shouldIncludeError = !errorMessage.includes('requestInterceptor') && !errorMessage.includes('temporarily disabled');
    
    return {
      isHealthy: false,
      latency,
      error: shouldIncludeError ? errorMessage : undefined
    };
  }
}

// Export the main client instance (lazy initialization)
// Only initialize on server-side to avoid client-side bundling issues
export const workerBee = typeof window === 'undefined' ? getWorkerBeeClient() : null;
