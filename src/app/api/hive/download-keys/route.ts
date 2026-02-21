import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler, apiError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { decryptKeys } from '@/lib/hive/key-encryption';
import { prisma } from '@/lib/db/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { jwtFieldsCache } from '@/lib/auth/next-auth-options';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler('/api/hive/download-keys', async (request: Request, ctx) => {
  // 1. Authenticate — must be a custodial (soft) user
  const user = await getAuthenticatedUserFromSession(request as NextRequest);

  if (!user) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  if (user.authType !== 'soft') {
    return apiError('Key download is only available for custodial accounts', 'FORBIDDEN', 403, {
      requestId: ctx.requestId,
    });
  }

  if (!user.hiveUsername) {
    return apiError('No Hive account linked to this user', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  // 1b. Rate limit — prevent bulk download attempts
  const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.keyDownload, 'keyDownload');
  if (!rateLimit.success) {
    return apiError(
      'Too many key download attempts. Please try again later.',
      'RATE_LIMITED',
      429,
      {
        requestId: ctx.requestId,
      }
    );
  }

  // 1c. Require fresh NextAuth session (defense-in-depth beyond sb_session cookie)
  const nextAuthSession = await getServerSession(authOptions);
  if (!nextAuthSession?.user?.id || nextAuthSession.user.id !== user.userId) {
    return apiError('Please re-authenticate to download your keys', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  // 2. Look up encrypted keys
  const custodialUser = await prisma.custodialUser.findFirst({
    where: { hiveUsername: user.hiveUsername },
    select: { id: true, encryptedKeys: true, encryptionIv: true, encryptionSalt: true },
  });

  if (!custodialUser?.encryptedKeys || !custodialUser.encryptionIv) {
    return apiError('No keys found for this account', 'NOT_FOUND', 404, {
      requestId: ctx.requestId,
    });
  }

  // 3. Decrypt keys
  let keys: Record<string, string>;
  try {
    const keysJson = decryptKeys(
      custodialUser.encryptedKeys,
      custodialUser.encryptionIv,
      custodialUser.encryptionSalt ?? undefined
    );
    keys = JSON.parse(keysJson);
  } catch (err) {
    ctx.log.error('Key decryption/parsing failed', {
      hiveUsername: user.hiveUsername,
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError('Unable to decrypt your keys. Please contact support.', 'INTERNAL_ERROR', 500, {
      requestId: ctx.requestId,
    });
  }

  // 4. Build plain-text keyfile
  const keyfile = [
    '================================================================',
    `  Sportsblock - Hive Keys for @${user.hiveUsername}`,
    '================================================================',
    '',
    'IMPORTANT: Keep this file safe and private!',
    'Anyone with these keys can control your Hive account.',
    '',
    '--- Your Keys ---',
    '',
    ...(keys.master ? [`Master Password: ${keys.master}`, ''] : []),
    ...(keys.owner ? [`Owner Key:   ${keys.owner}`, ''] : []),
    ...(keys.active ? [`Active Key:  ${keys.active}`, ''] : []),
    ...(keys.posting ? [`Posting Key: ${keys.posting}`, ''] : []),
    ...(keys.memo ? [`Memo Key:    ${keys.memo}`, ''] : []),
    '',
    '--- How to Use These Keys ---',
    '',
    '1. Install Hive Keychain browser extension:',
    '   https://hive-keychain.com',
    '',
    '2. Open Keychain and click "Add Account"',
    '',
    '3. Enter your username: ' + user.hiveUsername,
    '',
    '4. Paste each key into the corresponding field',
    '',
    '5. Once imported, you can log into Sportsblock with',
    '   Hive Keychain for full self-custody.',
    '',
    '================================================================',
    `  Generated: ${new Date().toISOString()}`,
    '  Delete this file after importing into Hive Keychain.',
    '================================================================',
    '',
  ].join('\n');

  // 5. Mark keys as downloaded
  await prisma.custodialUser.update({
    where: { id: custodialUser.id },
    data: {
      keysDownloaded: true,
      keysDownloadedAt: new Date(),
    },
  });
  jwtFieldsCache.invalidateByTag(`custodial-user:${custodialUser.id}`);

  ctx.log.info('Keys downloaded', { hiveUsername: user.hiveUsername });

  // 6. Return as downloadable text file
  const filename = `sportsblock-${user.hiveUsername}-keys.txt`;
  return new NextResponse(keyfile, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
