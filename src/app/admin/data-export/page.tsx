import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, SUPER_ADMIN_SESSION_COOKIE, SUPER_ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import DataExportContent from './data-export-content';

export default async function DataExportPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  const superSession = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);

  if (session?.value !== ADMIN_SESSION_VALUE && superSession?.value !== SUPER_ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  if (superSession?.value !== SUPER_ADMIN_SESSION_VALUE) {
    redirect('/admin/dashboard');
  }

  return <DataExportContent />;
}