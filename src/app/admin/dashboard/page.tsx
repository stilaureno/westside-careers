import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, SUPER_ADMIN_SESSION_COOKIE, SUPER_ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import DashboardContent from './dashboard-content';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  
  if (session?.value !== ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  const superAdminSession = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);
  const isSuperAdmin = superAdminSession?.value === SUPER_ADMIN_SESSION_VALUE;

  return <DashboardContent isSuperAdmin={isSuperAdmin} />;
}
