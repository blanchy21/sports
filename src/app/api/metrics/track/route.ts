/**
 * Metrics Tracking API Route
 *
 * Allows client-side tracking of post views and engagement.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  trackPostView,
  trackVote,
  trackComment,
  trackShare,
} from '@/lib/metrics/tracker';

interface TrackRequest {
  type: 'view' | 'vote' | 'comment' | 'share';
  author: string;
  permlink: string;
  viewerAccount?: string;
  referrer?: string;
}

/**
 * POST /api/metrics/track
 *
 * Track engagement events for posts
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrackRequest;
    const { type, author, permlink, viewerAccount, referrer } = body;

    // Validate required fields
    if (!type || !author || !permlink) {
      return NextResponse.json(
        { error: 'Missing required fields: type, author, permlink' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['view', 'vote', 'comment', 'share'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: view, vote, comment, or share' },
        { status: 400 }
      );
    }

    // Track the event
    switch (type) {
      case 'view':
        await trackPostView(author, permlink, viewerAccount, referrer);
        break;
      case 'vote':
        if (!viewerAccount) {
          return NextResponse.json(
            { error: 'viewerAccount required for vote tracking' },
            { status: 400 }
          );
        }
        await trackVote(author, permlink, viewerAccount);
        break;
      case 'comment':
        if (!viewerAccount) {
          return NextResponse.json(
            { error: 'viewerAccount required for comment tracking' },
            { status: 400 }
          );
        }
        await trackComment(author, permlink, viewerAccount);
        break;
      case 'share':
        await trackShare(author, permlink, viewerAccount);
        break;
    }

    return NextResponse.json({
      success: true,
      tracked: { type, author, permlink },
    });
  } catch (error) {
    console.error('Error tracking metrics:', error);

    // Don't expose internal errors - metrics tracking shouldn't break the app
    return NextResponse.json({
      success: true, // Return success even on error to not disrupt UX
      note: 'Tracking may have been delayed',
    });
  }
}
