/** @jest-environment jsdom */

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import type { Notification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;

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

  it('hydrates from storage and adds notifications manually', async () => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let latestContext: any = null;

    render(
      <NotificationProvider>
        <TestConsumer onChange={(ctx) => (latestContext = ctx)} />
      </NotificationProvider>
    );

    // Wait for hydration from storage
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

    // Realtime is disabled on client-side (WorkerBee is server-only)
    await waitFor(() => expect(latestContext?.isRealtimeActive).toBe(false));

    // Test manual notification adding
    act(() => {
      latestContext!.addNotification({
        type: 'comment',
        title: 'New Comment',
        message: '@alice commented on your post',
        data: {
          author: 'alice',
          permlink: 'new-post',
          parentAuthor: 'paul',
          parentPermlink: 'sports',
        },
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

    // Test adding another notification
    act(() => {
      latestContext!.addNotification({
        type: 'vote',
        title: 'New Vote',
        message: '@bob voted on your post',
        data: {
          voter: 'bob',
          author: 'paul',
          permlink: 'new-post',
          weight: 1000,
        },
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

    // Verify persistence to localStorage
    const saved = localStorage.getItem(storageKey);
    expect(saved).not.toBeNull();
    expect(saved).toContain('"type":"vote"');
  });
});

