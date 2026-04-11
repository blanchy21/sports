import React from 'react';
import type { Metadata } from 'next';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { fetchAllEvents } from '@/lib/sports/espn';
import { fetchCricketEvents } from '@/lib/sports/cricket';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import {
  MATCH_THREAD_CONFIG,
  getMatchThreadPermlink,
  createMatchThread,
} from '@/lib/hive-workerbee/match-threads';
import MatchThreadDetailClient from './MatchThreadDetailClient';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

async function getMatchThread(eventId: string) {
  const [espnResult, cricketResult] = await Promise.all([fetchAllEvents(), fetchCricketEvents()]);
  const events = [...espnResult.events, ...cricketResult.events];
  const liveEventIds = new Set([...espnResult.liveEventIds, ...cricketResult.liveEventIds]);
  const event = events.find((e) => e.id === eventId);

  if (!event) return null;

  const permlink = getMatchThreadPermlink(eventId);
  let biteCount = 0;

  try {
    const content = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_content', [
      MATCH_THREAD_CONFIG.PARENT_AUTHOR,
      permlink,
    ]);

    if (content && content.author && (content.body as string)?.length > 0) {
      biteCount = (content.children as number) || 0;
    }
  } catch {
    // Container doesn't exist yet
  }

  return createMatchThread(event, biteCount, liveEventIds);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const thread = await getMatchThread(eventId);

  if (!thread) {
    return { title: 'Match Thread Not Found | Sportsblock' };
  }

  const { event } = thread;
  const title = event.teams
    ? `${event.teams.home} vs ${event.teams.away} — Match Thread | Sportsblock`
    : `${event.name} — Match Thread | Sportsblock`;

  const description = event.teams
    ? `Live discussion: ${event.teams.home} vs ${event.teams.away}. ${event.sport}${event.league ? ` — ${event.league}` : ''}. Join the conversation on Sportsblock.`
    : `Live discussion: ${event.name}. Join the conversation on Sportsblock.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://sportsblock.app/match-threads/${eventId}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function MatchThreadDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const thread = await getMatchThread(eventId);

  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/match-threads"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-sb-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Match Threads
        </Link>

        <div className="rounded-xl border bg-sb-stadium p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/15 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Match thread not found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            This thread may not exist yet or the event has expired.
          </p>
        </div>
      </div>
    );
  }

  return <MatchThreadDetailClient thread={thread} />;
}
