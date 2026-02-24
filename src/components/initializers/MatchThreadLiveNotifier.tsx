'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/core/Toast';
import type { MatchThread } from '@/types/sports';

const POLL_INTERVAL = 60_000;
const TOAST_DURATION = 8_000;
const STORAGE_KEY = 'sportsblock-live-notified';
const STORAGE_TTL = 24 * 60 * 60 * 1000;

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: { ids: string[]; ts: number } = JSON.parse(raw);
    if (Date.now() - parsed.ts > STORAGE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function saveNotifiedId(eventId: string) {
  const existing = getNotifiedIds();
  existing.add(eventId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: Array.from(existing), ts: Date.now() }));
}

function getEventDisplayName(thread: MatchThread): string {
  if (thread.event.teams) {
    return `${thread.event.teams.home} vs ${thread.event.teams.away}`;
  }
  return thread.event.name;
}

export const MatchThreadLiveNotifier: React.FC = () => {
  const { addToast } = useToast();
  const router = useRouter();
  const previousStatuses = useRef<Map<string, string>>(new Map());
  const isFirstPoll = useRef(true);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/match-threads');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const threads: MatchThread[] = data.matchThreads ?? [];
      const notified = getNotifiedIds();

      for (const thread of threads) {
        const prev = previousStatuses.current.get(thread.eventId);
        const isNewlyLive =
          thread.event.status === 'live' && prev === 'upcoming' && !notified.has(thread.eventId);

        if (isNewlyLive && !isFirstPoll.current) {
          const name = getEventDisplayName(thread);
          const eventId = thread.eventId;

          addToast({
            title: 'Match Thread Live',
            description: name,
            type: 'info',
            duration: TOAST_DURATION,
            onClick: () => router.push(`/match-threads/${eventId}`),
          });

          saveNotifiedId(eventId);
        }

        previousStatuses.current.set(thread.eventId, thread.event.status);
      }

      isFirstPoll.current = false;
    } catch {
      // Network errors are fine — just skip this poll cycle
    }
  }, [addToast, router]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  return null;
};
