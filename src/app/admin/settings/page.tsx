import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, SUPER_ADMIN_SESSION_COOKIE, SUPER_ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import SettingsContent from './settings-content';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  const superSession = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);

  if (session?.value !== ADMIN_SESSION_VALUE && superSession?.value !== SUPER_ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  if (superSession?.value !== SUPER_ADMIN_SESSION_VALUE) {
    redirect('/admin/dashboard');
  }

  return <SettingsContent />;
}