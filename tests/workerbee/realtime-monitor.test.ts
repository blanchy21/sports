/** @jest-environment node */

import { RealtimeMonitor } from '@/lib/hive-workerbee/realtime';

const startMock = jest.fn();
const stopMock = jest.fn();
const postSubscribeMock = jest.fn();
const voteSubscribeMock = jest.fn();
const commentSubscribeMock = jest.fn();
const postUnsubscribeMock = jest.fn();
const voteUnsubscribeMock = jest.fn();
const commentUnsubscribeMock = jest.fn();

type SubscriptionHandlers = {
  next: (data: unknown) => void;
  error: (error: unknown) => void;
};

const postHandlers: SubscriptionHandlers[] = [];
const voteHandlers: SubscriptionHandlers[] = [];
const commentHandlers: SubscriptionHandlers[] = [];

const mockClient = {
  start: startMock,
  stop: stopMock,
  observe: {
    onPostsWithTags: jest.fn(() => ({
      subscribe: postSubscribeMock,
    })),
    onVotes: jest.fn(() => ({
      subscribe: voteSubscribeMock,
    })),
    onComments: jest.fn(() => ({
      subscribe: commentSubscribeMock,
    })),
  },
};

jest.mock('@/lib/hive-workerbee/client', () => ({
  getWorkerBeeClient: jest.fn(() => mockClient),
  initializeWorkerBeeClient: jest.fn(async () => mockClient),
  SPORTS_ARENA_CONFIG: {
    COMMUNITY_ID: 'hive-115814',
    COMMUNITY_NAME: 'sportsblock',
  },
}));

jest.mock('@/lib/hive-workerbee/content', () => ({
  fetchSportsblockPosts: jest.fn(async () => ({ posts: [], hasMore: false })),
}));

jest.mock('@/lib/hive-workerbee/api', () => ({
  makeWorkerBeeApiCall: jest.fn(async () => ({ head_block_number: 1000 })),
}));

jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { initializeWorkerBeeClient } = jest.requireMock('@/lib/hive-workerbee/client');

beforeEach(() => {
  jest.clearAllMocks();
  postHandlers.length = 0;
  voteHandlers.length = 0;
  commentHandlers.length = 0;

  postSubscribeMock.mockImplementation((handlers: typeof postHandlers[number]) => {
    postHandlers.push(handlers);
    return { unsubscribe: postUnsubscribeMock };
  });
  voteSubscribeMock.mockImplementation((handlers: typeof voteHandlers[number]) => {
    voteHandlers.push(handlers);
    return { unsubscribe: voteUnsubscribeMock };
  });
  commentSubscribeMock.mockImplementation((handlers: typeof commentHandlers[number]) => {
    commentHandlers.push(handlers);
    return { unsubscribe: commentUnsubscribeMock };
  });
});

describe('RealtimeMonitor', () => {
  it('starts WorkerBee client and subscribes to feeds once', async () => {
    const monitor = new RealtimeMonitor();

    await monitor.start({ processHistory: false });

    expect(initializeWorkerBeeClient).toHaveBeenCalledTimes(1);
    expect(postSubscribeMock).toHaveBeenCalledTimes(1);
    expect(voteSubscribeMock).toHaveBeenCalledTimes(1);
    expect(commentSubscribeMock).toHaveBeenCalledTimes(1);

    await monitor.start({ processHistory: false });

    // Second invocation should be no-op
    expect(postSubscribeMock).toHaveBeenCalledTimes(1);
    expect(voteSubscribeMock).toHaveBeenCalledTimes(1);
    expect(commentSubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from feeds and stops client', async () => {
    const monitor = new RealtimeMonitor();

    await monitor.start({ processHistory: false });
    await monitor.stop();

    expect(postUnsubscribeMock).toHaveBeenCalledTimes(1);
    expect(voteUnsubscribeMock).toHaveBeenCalledTimes(1);
    expect(commentUnsubscribeMock).toHaveBeenCalledTimes(1);
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('emits events to registered callbacks', async () => {
    const monitor = new RealtimeMonitor();
    const callback = jest.fn();

    monitor.addCallback(callback);
    await monitor.start({ processHistory: false });

    const samplePost = {
      type: 'post',
      data: {
        post: {
          author: 'alice',
          permlink: 'hello',
          title: 'Hello',
          body: 'World',
          created: new Date().toISOString(),
          json_metadata: JSON.stringify({ tags: ['sportsblock'] }),
        },
      },
    };

    postHandlers[0]?.next(samplePost);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_post',
        data: expect.objectContaining({ author: 'alice', permlink: 'hello' }),
      }),
    );
  });
});

