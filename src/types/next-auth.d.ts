import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      displayName?: string;
      avatarUrl?: string;
      hiveUsername?: string;
      keysDownloaded?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    custodialUserId?: string;
    displayName?: string;
    avatarUrl?: string;
    hiveUsername?: string;
    keysDownloaded?: boolean;
  }
}
