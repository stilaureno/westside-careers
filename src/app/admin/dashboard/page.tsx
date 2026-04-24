import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import DashboardContent from './dashboard-content';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  
  if (session?.value !== ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  return <DashboardContent />;
}
