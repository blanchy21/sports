import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import TwitterProvider from 'next-auth/providers/twitter';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { MemoryCache } from '@/lib/cache/memory-cache';
import { logger } from '@/lib/logger';

// OAuth provider profile schemas. We `.safeParse()` these at JWT callback
// time so that silent upstream shape changes (Twitter v2 payload drift,
// Google response tweaks) don't land NULLs in CustodialUser columns.
const googleProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

// Twitter v2.0 nests everything under `data`; older v1 clients may still
// return flat fields. Accept either shape and normalize.
const twitterProfileSchema = z.object({
  name: z.string().optional(),
  data: z
    .object({
      username: z.string().optional(),
      profile_image_url: z.string().url().optional(),
    })
    .optional(),
  screen_name: z.string().optional(),
  profile_image_url_https: z.string().url().optional(),
});

export const jwtFieldsCache = new MemoryCache({
  maxEntries: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  name: 'jwt-fields',
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days — matches sb_session
  },

  pages: {
    signIn: '/auth',
    error: '/auth',
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign-in, upsert CustodialUser and embed fields into JWT
      if (account && profile) {
        let custodialUser: Awaited<ReturnType<typeof prisma.custodialUser.upsert>>;

        if (account.provider === 'google') {
          const parsed = googleProfileSchema.safeParse(profile);
          if (!parsed.success) {
            logger.error(
              'Google OAuth profile failed schema validation',
              'auth:next-auth',
              parsed.error
            );
            throw new Error('Google profile response was malformed');
          }

          const googleId = account.providerAccountId;
          const { email, name: displayName, picture: avatarUrl } = parsed.data;

          custodialUser = await prisma.custodialUser.upsert({
            where: { googleId },
            create: { googleId, email, displayName, avatarUrl },
            update: { email, displayName, avatarUrl },
          });
        } else {
          // Twitter (or any future OAuth provider)
          const parsed = twitterProfileSchema.safeParse(profile);
          if (!parsed.success) {
            logger.error(
              'Twitter OAuth profile failed schema validation',
              'auth:next-auth',
              parsed.error
            );
            throw new Error('Twitter profile response was malformed');
          }

          const twitterId = account.providerAccountId;
          const twitterHandle = parsed.data.data?.username ?? parsed.data.screen_name;
          const displayName = parsed.data.name ?? twitterHandle;
          const avatarUrl =
            parsed.data.data?.profile_image_url ?? parsed.data.profile_image_url_https;

          custodialUser = await prisma.custodialUser.upsert({
            where: { twitterId },
            create: { twitterId, twitterHandle, displayName, avatarUrl },
            update: { twitterHandle, displayName, avatarUrl },
          });
        }

        token.custodialUserId = custodialUser.id;
        token.email = custodialUser.email ?? undefined;
        token.displayName = custodialUser.displayName ?? undefined;
        token.avatarUrl = custodialUser.avatarUrl ?? undefined;
        token.hiveUsername = custodialUser.hiveUsername ?? undefined;
        token.keysDownloaded = custodialUser.keysDownloaded;
        token.onboardingCompleted = custodialUser.onboardingCompleted;
      } else if (token.custodialUserId) {
        // On subsequent requests, re-check mutable fields (cached with 5-min TTL)
        const cacheKey = `jwt-fields:${token.custodialUserId}`;
        const tag = `custodial-user:${token.custodialUserId}`;
        type JwtFields = {
          hiveUsername: string | null;
          keysDownloaded: boolean;
          onboardingCompleted: boolean;
        };

        let fields = jwtFieldsCache.get<JwtFields>(cacheKey);
        if (!fields) {
          const freshUser = await prisma.custodialUser.findUnique({
            where: { id: token.custodialUserId as string },
            select: { hiveUsername: true, keysDownloaded: true, onboardingCompleted: true },
          });
          if (freshUser) {
            fields = freshUser;
            // During onboarding, fields change rapidly (username → keys → complete).
            // Use a short TTL so stale cache on other serverless instances resolves
            // quickly. After onboarding, use the normal 5-min TTL for performance.
            const ttl = freshUser.onboardingCompleted ? 5 * 60 * 1000 : 30 * 1000;
            jwtFieldsCache.set(cacheKey, fields, { tags: [tag], ttl });
          }
        }

        if (fields) {
          if (fields.hiveUsername) {
            token.hiveUsername = fields.hiveUsername;
          }
          // Progressive fields — only advance forward, never regress from stale cache
          token.keysDownloaded =
            fields.keysDownloaded === true || (token.keysDownloaded as boolean) === true;
          token.onboardingCompleted =
            fields.onboardingCompleted === true || (token.onboardingCompleted as boolean) === true;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (!token.custodialUserId) {
          throw new Error('custodialUserId missing from JWT token');
        }
        session.user.id = token.custodialUserId as string;
        session.user.displayName = (token.displayName as string) ?? undefined;
        session.user.avatarUrl = (token.avatarUrl as string) ?? undefined;
        session.user.hiveUsername = (token.hiveUsername as string) ?? undefined;
        session.user.keysDownloaded = (token.keysDownloaded as boolean) ?? undefined;
        session.user.onboardingCompleted = (token.onboardingCompleted as boolean) ?? undefined;
      }
      return session;
    },
  },
};
