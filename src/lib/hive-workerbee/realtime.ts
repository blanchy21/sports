import { getWorkerBeeClient } from './client';
import { SPORTS_ARENA_CONFIG } from './client';
import type { IStartConfiguration } from "@hiveio/workerbee";

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
      subscribe: (handlers: { next: (data: StreamData) => void; error: (error: WebSocketError) => void }) => void;
    };
    onVotes: () => {
      subscribe: (handlers: { next: (data: StreamData) => void; error: (error: WebSocketError) => void }) => void;
    };
    onComments: () => {
      subscribe: (handlers: { next: (data: StreamData) => void; error: (error: WebSocketError) => void }) => void;
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

// Real-time monitoring class
export class RealtimeMonitor {
  private client: unknown = null;
  private isRunning = false;
  private callbacks: RealtimeEventCallback[] = [];

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      this.client = await getWorkerBeeClient();
      console.log('[RealtimeMonitor] WorkerBee client initialized');
    } catch (error) {
      console.error('[RealtimeMonitor] Failed to initialize client:', error);
    }
  }

  /**
   * Start real-time monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[RealtimeMonitor] Already running');
      return;
    }

    if (!this.client) {
      await this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Failed to initialize WorkerBee client');
    }

    try {
      // Start monitoring for new posts in Sportsblock community
      (this.client as { observe: { onPostsWithTags: (tags: string[]) => { subscribe: (handlers: { next: (data: StreamData) => void; error: (error: WebSocketError) => void }) => void } } }).observe.onPostsWithTags([SPORTS_ARENA_CONFIG.COMMUNITY_ID, 'sportsblock']).subscribe({
        next: (data: StreamData) => {
          console.log('[RealtimeMonitor] New post detected:', data);
          this.handleNewPost(data);
        },
        error: (error: WebSocketError) => {
          console.error('[RealtimeMonitor] Post monitoring error:', error);
        }
      });

      // Start monitoring for votes on Sportsblock posts
      (this.client as { observe: { onVotes: () => { subscribe: (handlers: { next: (data: StreamData) => void; error: (error: WebSocketError) => void }) => void } } }).observe.onVotes().subscribe({
        next: (data: StreamData) => {
          console.log('[RealtimeMonitor] New vote detected:', data);
          this.handleNewVote(data);
        },
        error: (error: WebSocketError) => {
          console.error('[RealtimeMonitor] Vote monitoring error:', error);
        }
      });

      // Start monitoring for comments on Sportsblock posts
      (this.client as { observe: { onComments: () => { subscribe: (handlers: { next: (data: StreamData) => void; error: (error: WebSocketError) => void }) => void } } }).observe.onComments().subscribe({
        next: (data: StreamData) => {
          console.log('[RealtimeMonitor] New comment detected:', data);
          this.handleNewComment(data);
        },
        error: (error: WebSocketError) => {
          console.error('[RealtimeMonitor] Comment monitoring error:', error);
        }
      });

      this.isRunning = true;
      console.log('[RealtimeMonitor] Real-time monitoring started');
    } catch (error) {
      console.error('[RealtimeMonitor] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[RealtimeMonitor] Not running');
      return;
    }

    try {
      if (this.client && typeof (this.client as { stop?: () => void | Promise<void> }).stop === 'function') {
        await (this.client as { stop: () => void | Promise<void> }).stop();
      }
      this.isRunning = false;
      console.log('[RealtimeMonitor] Real-time monitoring stopped');
    } catch (error) {
      console.error('[RealtimeMonitor] Error stopping monitoring:', error);
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
   */
  private emitEvent(event: RealtimeEvent): void {
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[RealtimeMonitor] Callback error:', error);
      }
    });
  }

  /**
   * Handle new post event
   */
  private handleNewPost(data: StreamData): void {
    try {
      const post = (data.data as { post?: { json_metadata?: string; [key: string]: unknown } })?.post || data.data as { json_metadata?: string; [key: string]: unknown };
      
      // Check if it's a Sportsblock post
      const metadata = JSON.parse((post as { json_metadata?: string }).json_metadata || '{}');
      const tags = (metadata as { tags?: string[] }).tags || [];
      
      if (!tags.includes('sportsblock') && !tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_NAME)) {
        return; // Not a Sportsblock post
      }

      const event: RealtimePostEvent = {
        type: 'new_post',
        data: {
          author: (post as { author?: string }).author || '',
          permlink: (post as { permlink?: string }).permlink || '',
          title: (post as { title?: string }).title || '',
          body: (post as { body?: string }).body || '',
          created: (post as { created?: string }).created || new Date().toISOString(),
          sportCategory: (metadata as { sport_category?: string }).sport_category
        }
      };

      this.emitEvent(event);
    } catch (error) {
      console.error('[RealtimeMonitor] Error handling new post:', error);
    }
  }

  /**
   * Handle new vote event
   */
  private handleNewVote(data: StreamData): void {
    try {
      const vote = (data.data as { vote?: { voter?: string; author?: string; permlink?: string; weight?: number; time?: string; [key: string]: unknown } })?.vote || data.data as { voter?: string; author?: string; permlink?: string; weight?: number; time?: string; [key: string]: unknown };
      
      // Check if it's a vote on a Sportsblock post
      // This would require checking the post's tags, which might need additional API calls
      // For now, we'll emit all votes and let the consumer filter
      
      const event: RealtimeVoteEvent = {
        type: 'new_vote',
        data: {
          voter: (vote as { voter?: string }).voter || '',
          author: (vote as { author?: string }).author || '',
          permlink: (vote as { permlink?: string }).permlink || '',
          weight: (vote as { weight?: number }).weight || 0,
          timestamp: (vote as { time?: string }).time || new Date().toISOString()
        }
      };

      this.emitEvent(event);
    } catch (error) {
      console.error('[RealtimeMonitor] Error handling new vote:', error);
    }
  }

  /**
   * Handle new comment event
   */
  private handleNewComment(data: StreamData): void {
    try {
      const comment = (data.data as { comment?: { author?: string; permlink?: string; parent_author?: string; parent_permlink?: string; body?: string; created?: string; [key: string]: unknown } })?.comment || data.data as { author?: string; permlink?: string; parent_author?: string; parent_permlink?: string; body?: string; created?: string; [key: string]: unknown };
      
      // Check if it's a comment on a Sportsblock post
      // This would require checking the parent post's tags
      // For now, we'll emit all comments and let the consumer filter
      
      const event: RealtimeCommentEvent = {
        type: 'new_comment',
        data: {
          author: (comment as { author?: string }).author || '',
          permlink: (comment as { permlink?: string }).permlink || '',
          parentAuthor: (comment as { parent_author?: string }).parent_author || '',
          parentPermlink: (comment as { parent_permlink?: string }).parent_permlink || '',
          body: (comment as { body?: string }).body || '',
          created: (comment as { created?: string }).created || new Date().toISOString()
        }
      };

      this.emitEvent(event);
    } catch (error) {
      console.error('[RealtimeMonitor] Error handling new comment:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isRunning: boolean; callbackCount: number } {
    return {
      isRunning: this.isRunning,
      callbackCount: this.callbacks.length
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
 */
export async function startRealtimeMonitoring(): Promise<void> {
  const monitor = getRealtimeMonitor();
  await monitor.start();
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
