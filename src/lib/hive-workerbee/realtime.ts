import { initializeWorkerBeeClient, getWorkerBeeClient } from './client';
import { SPORTS_ARENA_CONFIG } from './client';

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

// Real-time monitoring class
export class RealtimeMonitor {
  private client: any = null;
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
      this.client.observe.onPostsWithTags([SPORTS_ARENA_CONFIG.COMMUNITY_ID, 'sportsblock']).subscribe({
        next: (data: any) => {
          console.log('[RealtimeMonitor] New post detected:', data);
          this.handleNewPost(data);
        },
        error: (error: any) => {
          console.error('[RealtimeMonitor] Post monitoring error:', error);
        }
      });

      // Start monitoring for votes on Sportsblock posts
      this.client.observe.onVotes().subscribe({
        next: (data: any) => {
          console.log('[RealtimeMonitor] New vote detected:', data);
          this.handleNewVote(data);
        },
        error: (error: any) => {
          console.error('[RealtimeMonitor] Vote monitoring error:', error);
        }
      });

      // Start monitoring for comments on Sportsblock posts
      this.client.observe.onComments().subscribe({
        next: (data: any) => {
          console.log('[RealtimeMonitor] New comment detected:', data);
          this.handleNewComment(data);
        },
        error: (error: any) => {
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
      if (this.client && this.client.stop) {
        await this.client.stop();
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
  private handleNewPost(data: any): void {
    try {
      const post = data.post || data;
      
      // Check if it's a Sportsblock post
      const metadata = JSON.parse(post.json_metadata || '{}');
      const tags = metadata.tags || [];
      
      if (!tags.includes('sportsblock') && !tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_NAME)) {
        return; // Not a Sportsblock post
      }

      const event: RealtimePostEvent = {
        type: 'new_post',
        data: {
          author: post.author,
          permlink: post.permlink,
          title: post.title,
          body: post.body,
          created: post.created,
          sportCategory: metadata.sport_category
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
  private handleNewVote(data: any): void {
    try {
      const vote = data.vote || data;
      
      // Check if it's a vote on a Sportsblock post
      // This would require checking the post's tags, which might need additional API calls
      // For now, we'll emit all votes and let the consumer filter
      
      const event: RealtimeVoteEvent = {
        type: 'new_vote',
        data: {
          voter: vote.voter,
          author: vote.author,
          permlink: vote.permlink,
          weight: vote.weight,
          timestamp: vote.time || new Date().toISOString()
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
  private handleNewComment(data: any): void {
    try {
      const comment = data.comment || data;
      
      // Check if it's a comment on a Sportsblock post
      // This would require checking the parent post's tags
      // For now, we'll emit all comments and let the consumer filter
      
      const event: RealtimeCommentEvent = {
        type: 'new_comment',
        data: {
          author: comment.author,
          permlink: comment.permlink,
          parentAuthor: comment.parent_author,
          parentPermlink: comment.parent_permlink,
          body: comment.body,
          created: comment.created
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
