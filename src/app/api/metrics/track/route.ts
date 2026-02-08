/**
 * Metrics Tracking API Route
 *
 * Allows client-side tracking of post views and engagement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackPostView, trackVote, trackComment, trackShare } from '@/lib/metrics/tracker';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { logger } from '@/lib/logger';

const trackSchema = z.object({
  type: z.enum(['view', 'vote', 'comment', 'share']),
  author: z.string().min(1).max(50),
  permlink: z.string().min(1).max(255),
  viewerAccount: z.string().max(50).optional(),
  referrer: z.string().max(500).optional(),
});

/**
 * POST /api/metrics/track
 *
 * Track engagement events for posts
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.read, 'metricsTrack');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429, headers: createRateLimitHeaders(0, rateLimit.reset, RATE_LIMITS.read.limit) }
    );
  }

  try {
    // Parse JSON body with dedicated error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate with Zod
    const parseResult = trackSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { type, author, permlink, viewerAccount, referrer } = parseResult.data;

    // Track the event
    switch (type) {
      case 'view':
        await trackPostView(author, permlink, viewerAccount, referrer);
        break;
      case 'vote':
        if (!viewerAccount) {
          return NextResponse.json(
            { success: false, error: 'viewerAccount required for vote tracking' },
            { status: 400 }
          );
        }
        await trackVote(author, permlink, viewerAccount);
        break;
      case 'comment':
        if (!viewerAccount) {
          return NextResponse.json(
            { success: false, error: 'viewerAccount required for comment tracking' },
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
    logger.error(
      'Metrics tracking failed',
      'metricsTrack',
      error instanceof Error ? error : undefined
    );

    return NextResponse.json({ success: false, error: 'Tracking failed' }, { status: 500 });
  }
}
