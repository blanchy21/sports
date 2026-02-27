import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/tips';

const tipSchema = z.object({
  recipientUsername: z.string().min(1).max(50),
  amount: z.number().positive(),
  author: z.string().min(1).max(50),
  permlink: z.string().min(1).max(255),
  txId: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const body = await request.json();
      const parseResult = tipSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { recipientUsername, amount, author, permlink, txId } = parseResult.data;

      // Require authentication to prevent sender spoofing
      const user = await getAuthenticatedUserFromSession(request);
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }
      const username = user.username;
      const userId = user.userId;

      // Record the tip
      await prisma.tip.create({
        data: {
          senderUsername: username,
          recipientUsername,
          amount,
          author,
          permlink,
          txId,
        },
      });

      // Create notification for the recipient (if they have a Profile)
      try {
        const recipient = await prisma.profile.findFirst({
          where: {
            OR: [{ username: recipientUsername }, { hiveUsername: recipientUsername }],
          },
        });

        if (recipient && (!userId || recipient.id !== userId)) {
          await prisma.notification.create({
            data: {
              recipientId: recipient.id,
              type: 'tip',
              title: 'MEDALS Tip',
              message: `${username} tipped you ${amount} MEDALS`,
              sourceUserId: userId,
              sourceUsername: username,
              data: { author, permlink, amount, txId },
            },
          });
        }
      } catch (err) {
        logger.warn('Failed to create tip notification', 'soft-tips', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
