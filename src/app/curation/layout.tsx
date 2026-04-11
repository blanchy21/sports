import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decryptSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { isCuratorAsync } from '@/lib/rewards/curator-rewards';

/**
 * Curation layout — server-side authorization gate.
 *
 * Allows both admins AND active curators (unlike /admin which is admin-only).
 * This lets fullcoverbetting and other curators access the dashboard.
 */
export default async function CurationLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('sb_session');

  if (!sessionCookie?.value) {
    redirect('/');
  }

  const session = decryptSession(sessionCookie.value);
  if (!session) {
    redirect('/');
  }

  // Must be Hive-authenticated
  if (session.authType !== 'hive') {
    redirect('/');
  }

  // Must be admin or active curator
  const isAdmin = requireAdmin({ username: session.username, authType: session.authType });
  const isCurator = await isCuratorAsync(session.username);

  if (!isAdmin && !isCurator) {
    redirect('/');
  }

  return <>{children}</>;
}
