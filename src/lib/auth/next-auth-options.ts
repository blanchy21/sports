import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';

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
        // On subsequent requests, re-check mutable fields in case they changed after initial login
        const freshUser = await prisma.custodialUser.findUnique({
          where: { id: token.custodialUserId as string },
          select: { hiveUsername: true, keysDownloaded: true },
        });
        if (freshUser) {
          if (freshUser.hiveUsername) {
            token.hiveUsername = freshUser.hiveUsername;
          }
          token.keysDownloaded = freshUser.keysDownloaded;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.custodialUserId as string;
        session.user.displayName = token.displayName as string | undefined;
        session.user.avatarUrl = token.avatarUrl as string | undefined;
        session.user.hiveUsername = token.hiveUsername as string | undefined;
        session.user.keysDownloaded = token.keysDownloaded as boolean | undefined;
      }
      return session;
    },
  },
};
