import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
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
        const googleId = account.providerAccountId;
        const email = profile.email!;
        const displayName = profile.name ?? undefined;
        const avatarUrl = (profile as { picture?: string }).picture ?? undefined;

        const custodialUser = await prisma.custodialUser.upsert({
          where: { googleId },
          create: { googleId, email, displayName, avatarUrl },
          update: { email, displayName, avatarUrl },
        });

        token.custodialUserId = custodialUser.id;
        token.email = custodialUser.email;
        token.displayName = custodialUser.displayName ?? undefined;
        token.avatarUrl = custodialUser.avatarUrl ?? undefined;
        token.hiveUsername = custodialUser.hiveUsername ?? undefined;
        token.keysDownloaded = custodialUser.keysDownloaded;
      } else if (token.custodialUserId) {
        // On subsequent requests, re-check mutable fields (cached with 5-min TTL)
        const cacheKey = `jwt-fields:${token.custodialUserId}`;
        const tag = `custodial-user:${token.custodialUserId}`;
        type JwtFields = { hiveUsername: string | null; keysDownloaded: boolean };

        let fields = jwtFieldsCache.get<JwtFields>(cacheKey);
        if (!fields) {
          const freshUser = await prisma.custodialUser.findUnique({
            where: { id: token.custodialUserId as string },
            select: { hiveUsername: true, keysDownloaded: true },
          });
          if (freshUser) {
            fields = freshUser;
            jwtFieldsCache.set(cacheKey, fields, { tags: [tag] });
          }
        }

        if (fields) {
          if (fields.hiveUsername) {
            token.hiveUsername = fields.hiveUsername;
          }
          token.keysDownloaded = fields.keysDownloaded;
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
      }
      return session;
    },
  },
};
