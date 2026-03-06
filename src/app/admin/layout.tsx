import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decryptSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';

/**
 * Admin layout — server-side authorization gate.
 *
 * Decrypts the session cookie and verifies the user is a Hive-authed admin.
 * The Edge middleware only checks cookie *existence* (can't decrypt in Edge runtime),
 * so this layout provides the real authorization check.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('sb_session');

  if (!sessionCookie?.value) {
    redirect('/');
  }

  const session = decryptSession(sessionCookie.value);
  if (!session || !requireAdmin({ username: session.username, authType: session.authType })) {
    redirect('/');
  }

  return <>{children}</>;
}
