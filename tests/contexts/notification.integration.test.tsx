/** @jest-environment jsdom */

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/client', () => ({
  getWorkerBeeClient: jest.fn(),
}));

import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import type { Notification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getWorkerBeeClient } from '@/lib/hive-workerbee/client';

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const getWorkerBeeClientMock = getWorkerBeeClient as jest.MockedFunction<typeof getWorkerBeeClient>;

type NotificationContextShape = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isRealtimeActive: boolean;
};

const TestConsumer: React.FC<{ onChange: (ctx: NotificationContextShape) => void }> = ({ onChange }) => {
  const ctx = useNotifications();
  useEffect(() => {
    onChange(ctx as NotificationContextShape);
  }, [ctx, onChange]);
  return null;
};

describe('NotificationProvider integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAuthMock.mockReturnValue({
      user: { username: 'paul' },
      isClient: true,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('hydrates from storage and processes realtime comment and vote events', async () => {
    const storageKey = 'sportsblock-notifications:paul';
    const storedNotification = {
      id: 'stored-1',
      type: 'comment' as Notification['type'],
      title: 'Stored',
      message: 'Existing notice',
      timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
      read: true,
      data: { author: 'initial', permlink: 'init-post' },
    };
    localStorage.setItem(storageKey, JSON.stringify([storedNotification]));

    let commentHandler: { next: (payload: unknown) => void; error: (err: unknown) => void } | null = null;
    let voteHandler: { next: (payload: unknown) => void; error: (err: unknown) => void } | null = null;

    const workerBeeStub = {
      running: false,
      start: jest.fn(async () => {
        workerBeeStub.running = true;
      }),
      observe: {
        onComments: () => ({
          subscribe: (handlers: { next: (payload: unknown) => void; error: (err: unknown) => void }) => {
            commentHandler = handlers;
            return { unsubscribe: jest.fn() };
          },
        }),
        onVotes: () => ({
          subscribe: (handlers: { next: (payload: unknown) => void; error: (err: unknown) => void }) => {
            voteHandler = handlers;
            return { unsubscribe: jest.fn() };
          },
        }),
      },
    };

    getWorkerBeeClientMock.mockReturnValue(workerBeeStub as unknown as ReturnType<typeof getWorkerBeeClient>);

    let latestContext: any = null;

    render(
      <NotificationProvider>
        <TestConsumer onChange={(ctx) => (latestContext = ctx)} />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(latestContext).not.toBeNull();
      expect(latestContext?.notifications.length).toBe(1);
    });

    expect(latestContext?.notifications[0]).toMatchObject({
      id: 'stored-1',
      title: 'Stored',
      read: true,
    });
    expect(latestContext?.notifications[0].timestamp).toBeInstanceOf(Date);

    await waitFor(() => expect(workerBeeStub.start).toHaveBeenCalled());
    await waitFor(() => expect(latestContext?.isRealtimeActive).toBe(true));
    expect(commentHandler).not.toBeNull();
    expect(voteHandler).not.toBeNull();

    act(() => {
      commentHandler!.next({
        comments: [
          {
            operation: {
              parent_author: 'paul',
              author: 'alice',
              permlink: 'new-post',
              parent_permlink: 'sports',
            },
          },
        ],
      });
    });

    await waitFor(() => expect(latestContext?.notifications.length).toBe(2));
    expect(latestContext?.notifications[0]).toMatchObject({
      type: 'comment',
      read: false,
      data: expect.objectContaining({
        author: 'alice',
        parentAuthor: 'paul',
      }),
    });

    act(() => {
      voteHandler!.next({
        votes: [
          {
            operation: {
              voter: 'bob',
              author: 'paul',
              permlink: 'new-post',
              weight: 1000,
            },
          },
        ],
      });
    });

    await waitFor(() => expect(latestContext?.notifications.length).toBe(3));
    expect(latestContext?.notifications[0]).toMatchObject({
      type: 'vote',
      read: false,
      data: expect.objectContaining({
        voter: 'bob',
        author: 'paul',
      }),
    });

    expect(latestContext?.unreadCount).toBe(2);

    const saved = localStorage.getItem(storageKey);
    expect(saved).not.toBeNull();
    expect(saved).toContain('"type":"vote"');
  });
});

