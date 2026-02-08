import { getWorkerBeeClient, initializeWorkerBeeClient, SPORTS_ARENA_CONFIG } from './client';
import type { IStartConfiguration } from '@hiveio/workerbee';
import { workerBee as workerBeeLog, error as logError, warn as logWarn } from './logger';
import { fetchSportsblockPosts } from './content';
import { makeWorkerBeeApiCall } from './api';

const REALTIME_DEBUG_ENABLED =
  process.env.NEXT_PUBLIC_WORKERBEE_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const isAuthorizedTestHook = () =>
  typeof window !== 'undefined' &&
  (
    window as unknown as {
      __TEST_DISABLE_WORKERBEE__?: boolean;
    }
  ).__TEST_DISABLE_WORKERBEE__ === true &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const realtimeDebugLog = (message: string, data?: unknown) => {
  if (!REALTIME_DEBUG_ENABLED) {
    return;
  }
  workerBeeLog(message, 'RealtimeMonitor', data);
};

// Real-time event types
export interface RealtimePostEvent {
  type: 'new_post';
  data: {
    author: string;
    permlink: string;
    title: string;
    body: string;
    created: string;
    sportCategory?: string;
  };
}

export interface RealtimeVoteEvent {
  type: 'new_vote';
  data: {
    voter: string;
    author: string;
    permlink: string;
    weight: number;
    timestamp: string;
  };
}

export interface RealtimeCommentEvent {
  type: 'new_comment';
  data: {
    author: string;
    permlink: string;
    parentAuthor: string;
    parentPermlink: string;
    body: string;
    created: string;
  };
}

export type RealtimeEvent = RealtimePostEvent | RealtimeVoteEvent | RealtimeCommentEvent;

// Event callback type
export type RealtimeEventCallback = (event: RealtimeEvent) => void;

// WorkerBee client type - flexible interface to match actual WorkerBee
export type WorkerBeeClient = {
  start: (config: IStartConfiguration) => Promise<void>;
  stop: () => void | Promise<void>;
  observe: {
    onPostsWithTags: (tags: string[]) => {
      subscribe: (handlers: {
        next: (data: StreamData) => void;
        error: (error: WebSocketError) => void;
      }) => void;
    };
    onVotes: () => {
      subscribe: (handlers: {
        next: (data: StreamData) => void;
        error: (error: WebSocketError) => void;
      }) => void;
    };
    onComments: () => {
      subscribe: (handlers: {
        next: (data: StreamData) => void;
        error: (error: WebSocketError) => void;
      }) => void;
    };
  };
  chain?: unknown;
  [key: string]: unknown; // Allow additional properties
};

// Hive blockchain data types
export interface HiveBlockData {
  block_id: string;
  previous: string;
  timestamp: string;
  witness: string;
  transaction_merkle_root: string;
  extensions: unknown[];
  witness_signature: string;
  transactions: HiveTransaction[];
}

export interface HiveTransaction {
  ref_block_num: number;
  ref_block_prefix: number;
  expiration: string;
  operations: HiveOperation[];
  extensions: unknown[];
  signatures: string[];
}

export interface HiveOperation {
  type: string;
  value: {
    author?: string;
    permlink?: string;
    title?: string;
    body?: string;
    json_metadata?: string;
    parent_author?: string;
    parent_permlink?: string;
    voter?: string;
    weight?: number;
    [key: string]: unknown;
  };
}

// WebSocket error type
export interface WebSocketError {
  code: number;
  message: string;
  reason?: string;
  type?: string;
}

// Stream data types
export interface StreamData {
  type: string;
  data: {
    block?: HiveBlockData;
    transaction?: HiveTransaction;
    operation?: HiveOperation;
    [key: string]: unknown;
  };
}

// Error handler type
export type ErrorHandler = (error: WebSocketError | Error) => void;

type SubscriptionLike = { unsubscribe: () => void } | (() => void) | void;

// Storage key for last processed block
const LAST_PROCESSED_BLOCK_KEY = 'sportsblock_last_processed_block';

// Real-time monitoring class
export class RealtimeMonitor {
  private client: unknown = null;
  private isRunning = false;
  private callbacks: RealtimeEventCallback[] = [];
  private subscriptions: SubscriptionLike[] = [];
  private sportsblockAuthors: Set<string> = new Set();
  private authorCacheExpiry: number = 0;
  private readonly AUTHOR_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private lastProcessedBlock: number = 0;
  private isProcessingHistory: boolean = false;
  private authorCacheIntervalId: ReturnType<typeof setInterval> | null = null;
  private blockTrackingIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeClient();
    this.loadLastProcessedBlock();
  }

  private async initializeClient() {
    try {
      this.client = await getWorkerBeeClient();
      realtimeDebugLog('[RealtimeMonitor] WorkerBee client initialized');
    } catch (error) {
      logError(
        'Failed to initialize WorkerBee client',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load last processed block from storage
   */
  private loadLastProcessedBlock(): void {
    if (typeof window === 'undefined') return; // Server-side: skip localStorage

    try {
      const saved = localStorage.getItem(LAST_PROCESSED_BLOCK_KEY);
      if (saved) {
        this.lastProcessedBlock = parseInt(saved, 10) || 0;
        realtimeDebugLog(
          `[RealtimeMonitor] Loaded last processed block: ${this.lastProcessedBlock}`
        );
      }
    } catch (error) {
      logWarn('Failed to load last processed block', 'RealtimeMonitor', error);
    }
  }

  /**
   * Save last processed block to storage
   */
  private saveLastProcessedBlock(blockNumber: number): void {
    if (typeof window === 'undefined') return; // Server-side: skip localStorage

    try {
      this.lastProcessedBlock = blockNumber;
      localStorage.setItem(LAST_PROCESSED_BLOCK_KEY, blockNumber.toString());
      realtimeDebugLog(`[RealtimeMonitor] Saved last processed block: ${blockNumber}`);
    } catch (error) {
      logWarn('Failed to save last processed block', 'RealtimeMonitor', error);
    }
  }

  /**
   * Get current block number from blockchain
   */
  private async getCurrentBlockNumber(): Promise<number> {
    try {
      const globalProps = await makeWorkerBeeApiCall<{ head_block_number?: number }>(
        'get_dynamic_global_properties',
        []
      );
      return globalProps?.head_block_number || 0;
    } catch (error) {
      logError(
        'Failed to get current block number',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
      return 0;
    }
  }

  /**
   * Process historical data using providePastOperations
   */
  private async processHistoricalData(startBlock: number, endBlock: number): Promise<void> {
    if (startBlock >= endBlock) {
      realtimeDebugLog('[RealtimeMonitor] No historical data to process');
      return;
    }

    this.isProcessingHistory = true;
    realtimeDebugLog(
      `[RealtimeMonitor] Processing historical data from block ${startBlock} to ${endBlock}`
    );

    try {
      const client = this.client as {
        providePastOperations?: (
          start: number,
          end: number
        ) => {
          onPostsWithTags?: (tags: string[]) => {
            subscribe: (handlers: {
              next: (data: StreamData) => void;
              error: (error: WebSocketError) => void;
              complete?: () => void;
            }) => SubscriptionLike;
          };
        };
      };

      if (!client.providePastOperations) {
        logWarn(
          'providePastOperations not available, skipping historical processing',
          'RealtimeMonitor'
        );
        this.isProcessingHistory = false;
        return;
      }

      // Process historical posts
      await new Promise<void>((resolve, reject) => {
        if (!client.providePastOperations) {
          resolve(); // Historical processing not available
          return;
        }

        const pastOps = client.providePastOperations(startBlock, endBlock);
        const postsObserver = pastOps.onPostsWithTags?.([
          SPORTS_ARENA_CONFIG.COMMUNITY_ID,
          'sportsblock',
        ]);

        if (!postsObserver) {
          resolve(); // Historical posts observer not available
          return;
        }

        const historicalSubscription = postsObserver.subscribe({
          next: (data: StreamData) => {
            realtimeDebugLog('[RealtimeMonitor] Historical post detected:', data);
            this.handleNewPost(data);
          },
          error: (error: WebSocketError) => {
            logError(
              'Historical processing error',
              'RealtimeMonitor',
              error instanceof Error ? error : undefined,
              error
            );
            reject(error);
          },
          complete: () => {
            realtimeDebugLog('[RealtimeMonitor] Historical processing complete');
            resolve();
          },
        });

        if (!historicalSubscription) {
          resolve(); // No historical data to process
        }
      });

      // Update last processed block
      this.saveLastProcessedBlock(endBlock);
      this.isProcessingHistory = false;
    } catch (error) {
      this.isProcessingHistory = false;
      logError(
        'Error processing historical data',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
      // Don't throw - continue with live monitoring even if historical processing fails
    }
  }

  /**
   * Load and cache Sportsblock authors for filtering
   */
  private async loadSportsblockAuthors(): Promise<void> {
    const now = Date.now();

    // Use cached authors if still valid
    if (this.sportsblockAuthors.size > 0 && now < this.authorCacheExpiry) {
      realtimeDebugLog(
        `[RealtimeMonitor] Using cached authors (${this.sportsblockAuthors.size} authors)`
      );
      return;
    }

    try {
      realtimeDebugLog('[RealtimeMonitor] Loading Sportsblock authors...');

      // Fetch recent Sportsblock posts to build author list
      const posts = await fetchSportsblockPosts({ limit: 100 });

      // Extract unique authors
      const authors = new Set<string>();
      posts.posts.forEach((post) => {
        authors.add(post.author);
      });

      this.sportsblockAuthors = authors;
      this.authorCacheExpiry = now + this.AUTHOR_CACHE_TTL;

      realtimeDebugLog(`[RealtimeMonitor] Loaded ${authors.size} Sportsblock authors`);
    } catch (error) {
      logWarn(
        'Failed to load Sportsblock authors, will use fallback filtering',
        'RealtimeMonitor',
        error
      );
      // Continue with empty set - will use fallback filtering
    }
  }

  /**
   * Add author to cache (called when new posts are detected)
   */
  private addAuthorToCache(author: string): void {
    if (author && !this.sportsblockAuthors.has(author)) {
      this.sportsblockAuthors.add(author);
      realtimeDebugLog(`[RealtimeMonitor] Added author to cache: ${author}`);
    }
  }

  /**
   * Check if an author is a Sportsblock author
   */
  private isSportsblockAuthor(author: string): boolean {
    if (!author) return false;

    // If cache is empty, return true to allow through (will be filtered by post check)
    if (this.sportsblockAuthors.size === 0) {
      return true; // Allow through, will be filtered later
    }

    return this.sportsblockAuthors.has(author);
  }

  /**
   * Start real-time monitoring
   * Processes historical data first, then switches to live monitoring
   */
  async start(options: { processHistory?: boolean; historyBlocks?: number } = {}): Promise<void> {
    if (this.isRunning) {
      realtimeDebugLog('[RealtimeMonitor] Already running');
      return;
    }

    await this.ensureClientStarted();

    // Load Sportsblock authors for filtering
    await this.loadSportsblockAuthors();

    // Process historical data if enabled (default: true)
    const shouldProcessHistory = options.processHistory !== false;
    const historyBlocks = options.historyBlocks || 1000; // Default: last 1000 blocks (~3.5 hours)

    if (shouldProcessHistory) {
      try {
        const currentBlock = await this.getCurrentBlockNumber();
        const startBlock = Math.max(0, currentBlock - historyBlocks);

        if (this.lastProcessedBlock > 0 && this.lastProcessedBlock < currentBlock) {
          // Resume from last processed block
          realtimeDebugLog(`[RealtimeMonitor] Resuming from block ${this.lastProcessedBlock}`);
          await this.processHistoricalData(this.lastProcessedBlock, currentBlock);
        } else if (this.lastProcessedBlock === 0) {
          // First time: process recent history
          realtimeDebugLog(`[RealtimeMonitor] First run: processing last ${historyBlocks} blocks`);
          await this.processHistoricalData(startBlock, currentBlock);
        } else {
          realtimeDebugLog('[RealtimeMonitor] Already up to date, skipping historical processing');
        }
      } catch (error) {
        logWarn(
          'Historical processing failed, continuing with live monitoring',
          'RealtimeMonitor',
          error
        );
        // Continue with live monitoring even if historical processing fails
      }
    }

    try {
      this.clearSubscriptions();

      const observableApi = this.client as {
        observe: {
          onPostsWithTags: (tags: string[]) => {
            subscribe: (handlers: {
              next: (data: StreamData) => void;
              error: (error: WebSocketError) => void;
            }) => SubscriptionLike;
          };
          onVotes: () => {
            subscribe: (handlers: {
              next: (data: StreamData) => void;
              error: (error: WebSocketError) => void;
            }) => SubscriptionLike;
          };
          onComments: () => {
            subscribe: (handlers: {
              next: (data: StreamData) => void;
              error: (error: WebSocketError) => void;
            }) => SubscriptionLike;
          };
          onImpactedAccounts?: (...accounts: string[]) => {
            subscribe: (handlers: {
              next: (data: StreamData) => void;
              error: (error: WebSocketError) => void;
            }) => SubscriptionLike;
          };
        };
      };

      // Monitor posts with Sportsblock tags
      const postsSubscription = observableApi.observe
        .onPostsWithTags([SPORTS_ARENA_CONFIG.COMMUNITY_ID, 'sportsblock'])
        .subscribe({
          next: (data: StreamData) => {
            realtimeDebugLog('[RealtimeMonitor] New post detected:', data);
            this.handleNewPost(data);
          },
          error: (error: WebSocketError) => {
            logError(
              'Post monitoring error',
              'RealtimeMonitor',
              error instanceof Error ? error : undefined,
              error
            );
          },
        });

      // Improved vote monitoring: Use onImpactedAccounts if available, otherwise filter manually
      let votesSubscription: SubscriptionLike;

      if (observableApi.observe.onImpactedAccounts && this.sportsblockAuthors.size > 0) {
        // Use account-based filtering for better performance
        const authorsArray = Array.from(this.sportsblockAuthors);
        realtimeDebugLog(
          `[RealtimeMonitor] Monitoring votes for ${authorsArray.length} Sportsblock authors`
        );

        votesSubscription = observableApi.observe.onImpactedAccounts(...authorsArray).subscribe({
          next: (data: StreamData) => {
            realtimeDebugLog('[RealtimeMonitor] Vote on Sportsblock account detected:', data);
            this.handleNewVote(data);
          },
          error: (error: WebSocketError) => {
            logError(
              'Vote monitoring error',
              'RealtimeMonitor',
              error instanceof Error ? error : undefined,
              error
            );
          },
        });
      } else {
        // Fallback: monitor all votes and filter manually
        realtimeDebugLog('[RealtimeMonitor] Monitoring all votes (will filter manually)');
        votesSubscription = observableApi.observe.onVotes().subscribe({
          next: (data: StreamData) => {
            realtimeDebugLog('[RealtimeMonitor] New vote detected:', data);
            this.handleNewVote(data);
          },
          error: (error: WebSocketError) => {
            logError(
              'Vote monitoring error',
              'RealtimeMonitor',
              error instanceof Error ? error : undefined,
              error
            );
          },
        });
      }

      // Improved comment monitoring: Use onImpactedAccounts if available
      let commentsSubscription: SubscriptionLike;

      if (observableApi.observe.onImpactedAccounts && this.sportsblockAuthors.size > 0) {
        // Use account-based filtering for better performance
        const authorsArray = Array.from(this.sportsblockAuthors);
        realtimeDebugLog(
          `[RealtimeMonitor] Monitoring comments for ${authorsArray.length} Sportsblock authors`
        );

        commentsSubscription = observableApi.observe.onImpactedAccounts(...authorsArray).subscribe({
          next: (data: StreamData) => {
            realtimeDebugLog('[RealtimeMonitor] Comment on Sportsblock account detected:', data);
            this.handleNewComment(data);
          },
          error: (error: WebSocketError) => {
            logError(
              'Comment monitoring error',
              'RealtimeMonitor',
              error instanceof Error ? error : undefined,
              error
            );
          },
        });
      } else {
        // Fallback: monitor all comments and filter manually
        realtimeDebugLog('[RealtimeMonitor] Monitoring all comments (will filter manually)');
        commentsSubscription = observableApi.observe.onComments().subscribe({
          next: (data: StreamData) => {
            realtimeDebugLog('[RealtimeMonitor] New comment detected:', data);
            this.handleNewComment(data);
          },
          error: (error: WebSocketError) => {
            logError(
              'Comment monitoring error',
              'RealtimeMonitor',
              error instanceof Error ? error : undefined,
              error
            );
          },
        });
      }

      this.subscriptions.push(postsSubscription, votesSubscription, commentsSubscription);

      // Set isRunning BEFORE scheduling intervals to prevent double-start race
      this.isRunning = true;
      realtimeDebugLog('[RealtimeMonitor] Real-time monitoring started');

      // Clear any existing intervals before scheduling new ones (guard against double-start)
      if (this.authorCacheIntervalId !== null) {
        clearInterval(this.authorCacheIntervalId);
        this.authorCacheIntervalId = null;
      }
      if (this.blockTrackingIntervalId !== null) {
        clearInterval(this.blockTrackingIntervalId);
        this.blockTrackingIntervalId = null;
      }

      // Refresh author cache periodically
      this.scheduleAuthorCacheRefresh();

      // Update last processed block periodically (every 5 minutes)
      this.scheduleBlockTracking();
    } catch (error) {
      logError(
        'Failed to start realtime monitoring',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
      this.clearSubscriptions();
      throw error;
    }
  }

  /**
   * Schedule periodic refresh of author cache
   */
  private scheduleAuthorCacheRefresh(): void {
    // Refresh cache every 30 minutes
    this.authorCacheIntervalId = setInterval(() => {
      if (this.isRunning) {
        this.loadSportsblockAuthors().catch((error) => {
          logWarn('Failed to refresh author cache', 'RealtimeMonitor', error);
        });
      }
    }, this.AUTHOR_CACHE_TTL);
  }

  /**
   * Schedule periodic block tracking
   */
  private scheduleBlockTracking(): void {
    // Update last processed block every 5 minutes
    this.blockTrackingIntervalId = setInterval(
      async () => {
        if (this.isRunning && !this.isProcessingHistory) {
          try {
            const currentBlock = await this.getCurrentBlockNumber();
            if (currentBlock > this.lastProcessedBlock) {
              this.saveLastProcessedBlock(currentBlock);
            }
          } catch (error) {
            logWarn('Failed to update block tracking', 'RealtimeMonitor', error);
          }
        }
      },
      5 * 60 * 1000
    ); // 5 minutes
  }

  /**
   * Get last processed block number
   */
  getLastProcessedBlock(): number {
    return this.lastProcessedBlock;
  }

  /**
   * Check if currently processing historical data
   */
  isProcessingHistoricalData(): boolean {
    return this.isProcessingHistory;
  }

  /**
   * Stop real-time monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      realtimeDebugLog('[RealtimeMonitor] Not running');
      return;
    }

    try {
      this.clearSubscriptions();

      if (
        this.client &&
        typeof (this.client as { stop?: () => void | Promise<void> }).stop === 'function'
      ) {
        await (this.client as { stop: () => void | Promise<void> }).stop();
      }
      this.isRunning = false;
      realtimeDebugLog('[RealtimeMonitor] Real-time monitoring stopped');
    } catch (error) {
      logError(
        'Error stopping realtime monitoring',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Add event callback
   */
  addCallback(callback: RealtimeEventCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove event callback
   */
  removeCallback(callback: RealtimeEventCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to all callbacks
   * Snapshot the array to prevent issues if callbacks are added/removed during iteration.
   */
  private emitEvent(event: RealtimeEvent): void {
    const snapshot = [...this.callbacks];
    snapshot.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        logError(
          'Realtime callback error',
          'RealtimeMonitor',
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Ensure WorkerBee client is initialized and running
   */
  private async ensureClientStarted(): Promise<void> {
    if (isAuthorizedTestHook()) {
      if (!this.client) {
        const stubSubscribe = () => ({ unsubscribe: () => {} });
        this.client = {
          start: async () => {},
          stop: async () => {},
          observe: {
            onPostsWithTags: () => ({ subscribe: stubSubscribe }),
            onVotes: () => ({ subscribe: stubSubscribe }),
            onComments: () => ({ subscribe: stubSubscribe }),
          },
        } as WorkerBeeClient;
      }
      return;
    }

    try {
      const client = await initializeWorkerBeeClient();
      this.client = client;
    } catch (error) {
      logError(
        'Failed to start WorkerBee client',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Unsubscribe from all active realtime streams
   */
  private clearSubscriptions(): void {
    if (this.authorCacheIntervalId !== null) {
      clearInterval(this.authorCacheIntervalId);
      this.authorCacheIntervalId = null;
    }
    if (this.blockTrackingIntervalId !== null) {
      clearInterval(this.blockTrackingIntervalId);
      this.blockTrackingIntervalId = null;
    }
    this.subscriptions.forEach((subscription) => {
      try {
        if (typeof subscription === 'function') {
          subscription();
        } else if (
          subscription &&
          typeof (subscription as { unsubscribe?: () => void }).unsubscribe === 'function'
        ) {
          (subscription as { unsubscribe: () => void }).unsubscribe();
        }
      } catch (error) {
        logError(
          'Failed to unsubscribe from realtime stream',
          'RealtimeMonitor',
          error instanceof Error ? error : undefined
        );
      }
    });
    this.subscriptions = [];
  }

  /**
   * Handle new post event
   */
  private handleNewPost(data: StreamData): void {
    try {
      const post =
        (data.data as { post?: { json_metadata?: string; [key: string]: unknown } })?.post ||
        (data.data as { json_metadata?: string; [key: string]: unknown });
      const author = (post as { author?: string }).author || '';

      // Extract block number if available
      const blockNumber = (data.data as { block?: { number?: number } })?.block?.number;
      if (blockNumber && blockNumber > this.lastProcessedBlock) {
        this.saveLastProcessedBlock(blockNumber);
      }

      // Add author to cache for future filtering
      if (author) {
        this.addAuthorToCache(author);
      }

      // Check if it's a Sportsblock post (redundant check since we're already filtering by tags, but keep for safety)
      let metadata: { tags?: string[]; sport_category?: string };
      try {
        metadata = JSON.parse((post as { json_metadata?: string }).json_metadata || '{}');
      } catch {
        logWarn('Malformed json_metadata in realtime post, skipping', 'RealtimeMonitor');
        return;
      }
      const tags = metadata.tags || [];

      if (!tags.includes('sportsblock') && !tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_NAME)) {
        return; // Not a Sportsblock post
      }

      const event: RealtimePostEvent = {
        type: 'new_post',
        data: {
          author,
          permlink: (post as { permlink?: string }).permlink || '',
          title: (post as { title?: string }).title || '',
          body: (post as { body?: string }).body || '',
          created: (post as { created?: string }).created || new Date().toISOString(),
          sportCategory: (metadata as { sport_category?: string }).sport_category,
        },
      };

      this.emitEvent(event);
    } catch (error) {
      logError(
        'Error handling new post',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handle new vote event
   */
  private handleNewVote(data: StreamData): void {
    try {
      const vote =
        (
          data.data as {
            vote?: {
              voter?: string;
              author?: string;
              permlink?: string;
              weight?: number;
              time?: string;
              [key: string]: unknown;
            };
          }
        )?.vote ||
        (data.data as {
          voter?: string;
          author?: string;
          permlink?: string;
          weight?: number;
          time?: string;
          [key: string]: unknown;
        });
      const author = (vote as { author?: string }).author || '';

      // Filter: Only process votes on posts by Sportsblock authors
      // If using onImpactedAccounts, this check is redundant but safe
      // If using onVotes, this filters out non-Sportsblock votes
      if (author && !this.isSportsblockAuthor(author)) {
        // Not a Sportsblock author - skip this vote
        // But verify by checking the post if cache is empty
        if (this.sportsblockAuthors.size === 0) {
          // Cache is empty, verify by checking post
          this.verifyAndEmitVote(
            vote as {
              author?: string;
              permlink?: string;
              voter?: string;
              weight?: number;
              time?: string;
            }
          ).catch((error) => {
            realtimeDebugLog(
              'Vote verification failed',
              error instanceof Error ? error.message : error
            );
          });
        }
        return;
      }

      const event: RealtimeVoteEvent = {
        type: 'new_vote',
        data: {
          voter: (vote as { voter?: string }).voter || '',
          author,
          permlink: (vote as { permlink?: string }).permlink || '',
          weight: (vote as { weight?: number }).weight || 0,
          timestamp: (vote as { time?: string }).time || new Date().toISOString(),
        },
      };

      this.emitEvent(event);
    } catch (error) {
      logError(
        'Error handling new vote',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Verify if a vote is on a Sportsblock post and emit if so
   */
  private async verifyAndEmitVote(vote: {
    author?: string;
    permlink?: string;
    voter?: string;
    weight?: number;
    time?: string;
  }): Promise<void> {
    if (!vote.author || !vote.permlink) return;

    try {
      // Check if the post is a Sportsblock post
      const post = await makeWorkerBeeApiCall<{ json_metadata?: string }>('get_content', [
        vote.author,
        vote.permlink,
      ]);

      if (!post) return;

      let metadata: { tags?: string[] };
      try {
        metadata = JSON.parse(post.json_metadata || '{}');
      } catch {
        return; // Malformed metadata, skip
      }
      const tags = metadata.tags || [];

      if (tags.includes('sportsblock') || tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_NAME)) {
        // It's a Sportsblock post - add author to cache and emit vote
        this.addAuthorToCache(vote.author);

        const event: RealtimeVoteEvent = {
          type: 'new_vote',
          data: {
            voter: vote.voter || '',
            author: vote.author,
            permlink: vote.permlink,
            weight: vote.weight || 0,
            timestamp: vote.time || new Date().toISOString(),
          },
        };

        this.emitEvent(event);
      }
    } catch (error) {
      // Silently fail - don't spam logs for verification failures
      realtimeDebugLog('[RealtimeMonitor] Vote verification failed', error);
    }
  }

  /**
   * Handle new comment event
   */
  private handleNewComment(data: StreamData): void {
    try {
      const comment =
        (
          data.data as {
            comment?: {
              author?: string;
              permlink?: string;
              parent_author?: string;
              parent_permlink?: string;
              body?: string;
              created?: string;
              [key: string]: unknown;
            };
          }
        )?.comment ||
        (data.data as {
          author?: string;
          permlink?: string;
          parent_author?: string;
          parent_permlink?: string;
          body?: string;
          created?: string;
          [key: string]: unknown;
        });
      const parentAuthor = (comment as { parent_author?: string }).parent_author || '';

      // Filter: Only process comments on posts by Sportsblock authors
      // If using onImpactedAccounts, this check is redundant but safe
      // If using onComments, this filters out non-Sportsblock comments
      if (parentAuthor && !this.isSportsblockAuthor(parentAuthor)) {
        // Not a Sportsblock author - skip this comment
        // But verify by checking the parent post if cache is empty
        if (this.sportsblockAuthors.size === 0) {
          // Cache is empty, verify by checking parent post
          this.verifyAndEmitComment(
            comment as {
              parent_author?: string;
              parent_permlink?: string;
              author?: string;
              permlink?: string;
              body?: string;
              created?: string;
            }
          ).catch((error) => {
            realtimeDebugLog(
              'Comment verification failed',
              error instanceof Error ? error.message : error
            );
          });
        }
        return;
      }

      const event: RealtimeCommentEvent = {
        type: 'new_comment',
        data: {
          author: (comment as { author?: string }).author || '',
          permlink: (comment as { permlink?: string }).permlink || '',
          parentAuthor,
          parentPermlink: (comment as { parent_permlink?: string }).parent_permlink || '',
          body: (comment as { body?: string }).body || '',
          created: (comment as { created?: string }).created || new Date().toISOString(),
        },
      };

      this.emitEvent(event);
    } catch (error) {
      logError(
        'Error handling new comment',
        'RealtimeMonitor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Verify if a comment is on a Sportsblock post and emit if so
   */
  private async verifyAndEmitComment(comment: {
    parent_author?: string;
    parent_permlink?: string;
    author?: string;
    permlink?: string;
    body?: string;
    created?: string;
  }): Promise<void> {
    if (!comment.parent_author || !comment.parent_permlink) return;

    try {
      // Check if the parent post is a Sportsblock post
      const post = await makeWorkerBeeApiCall<{ json_metadata?: string }>('get_content', [
        comment.parent_author,
        comment.parent_permlink,
      ]);

      if (!post) return;

      let metadata: { tags?: string[] };
      try {
        metadata = JSON.parse(post.json_metadata || '{}');
      } catch {
        return; // Malformed metadata, skip
      }
      const tags = metadata.tags || [];

      if (tags.includes('sportsblock') || tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_NAME)) {
        // It's a Sportsblock post - add author to cache and emit comment
        this.addAuthorToCache(comment.parent_author);

        const event: RealtimeCommentEvent = {
          type: 'new_comment',
          data: {
            author: comment.author || '',
            permlink: comment.permlink || '',
            parentAuthor: comment.parent_author,
            parentPermlink: comment.parent_permlink,
            body: comment.body || '',
            created: comment.created || new Date().toISOString(),
          },
        };

        this.emitEvent(event);
      }
    } catch (error) {
      // Silently fail - don't spam logs for verification failures
      realtimeDebugLog('[RealtimeMonitor] Comment verification failed', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isRunning: boolean; callbackCount: number } {
    return {
      isRunning: this.isRunning,
      callbackCount: this.callbacks.length,
    };
  }
}

// Global real-time monitor instance
let globalMonitor: RealtimeMonitor | null = null;

/**
 * Get or create global real-time monitor
 */
export function getRealtimeMonitor(): RealtimeMonitor {
  if (!globalMonitor) {
    globalMonitor = new RealtimeMonitor();
  }
  return globalMonitor;
}

/**
 * Start global real-time monitoring
 * @param options - Monitoring options
 * @param options.processHistory - Whether to process historical data first (default: true)
 * @param options.historyBlocks - Number of blocks to process historically (default: 1000)
 */
export async function startRealtimeMonitoring(options?: {
  processHistory?: boolean;
  historyBlocks?: number;
}): Promise<void> {
  const monitor = getRealtimeMonitor();
  await monitor.start(options);
}

/**
 * Stop global real-time monitoring
 */
export async function stopRealtimeMonitoring(): Promise<void> {
  if (globalMonitor) {
    await globalMonitor.stop();
  }
}

/**
 * Add global event callback
 */
export function addRealtimeCallback(callback: RealtimeEventCallback): void {
  const monitor = getRealtimeMonitor();
  monitor.addCallback(callback);
}

/**
 * Remove global event callback
 */
export function removeRealtimeCallback(callback: RealtimeEventCallback): void {
  if (globalMonitor) {
    globalMonitor.removeCallback(callback);
  }
}

/**
 * Get global monitoring status
 */
export function getRealtimeStatus(): { isRunning: boolean; callbackCount: number } {
  if (!globalMonitor) {
    return { isRunning: false, callbackCount: 0 };
  }
  return globalMonitor.getStatus();
}

/**
 * Emit a realtime event (testing utility)
 */
export function emitRealtimeEventForTesting(event: RealtimeEvent): void {
  if (!isAuthorizedTestHook()) {
    throw new Error('Realtime test hooks are disabled');
  }
  const monitor = getRealtimeMonitor() as unknown as { emitEvent: (evt: RealtimeEvent) => void };
  monitor.emitEvent(event);
}

if (typeof window !== 'undefined') {
  (
    window as unknown as { __EMIT_REALTIME_EVENT__?: (event: RealtimeEvent) => void }
  ).__EMIT_REALTIME_EVENT__ = emitRealtimeEventForTesting;
}
