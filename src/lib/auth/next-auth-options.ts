import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import TwitterProvider from 'next-auth/providers/twitter';
import { prisma } from '@/lib/db/prisma';
import { MemoryCache } from '@/lib/cache/memory-cache';

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
          const googleId = account.providerAccountId;
          const email = profile.email!;
          const displayName = profile.name ?? undefined;
          const avatarUrl = (profile as { picture?: string }).picture ?? undefined;

          custodialUser = await prisma.custodialUser.upsert({
            where: { googleId },
            create: { googleId, email, displayName, avatarUrl },
            update: { email, displayName, avatarUrl },
          });
        } else {
          // Twitter (or any future OAuth provider)
          const twitterId = account.providerAccountId;
          const twitterHandle =
            (profile as { data?: { username?: string } }).data?.username ??
            (profile as { screen_name?: string }).screen_name ??
            undefined;
          const displayName = profile.name ?? twitterHandle ?? undefined;
          const avatarUrl =
            (profile as { data?: { profile_image_url?: string } }).data?.profile_image_url ??
            (profile as { profile_image_url_https?: string }).profile_image_url_https ??
            undefined;

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
