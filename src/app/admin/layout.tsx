import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_VALUE,
} from '@/lib/admin-session';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from './header';
import '/node_modules/bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
  title: 'Westside Careers Admin',
  description: 'Westside Careers Admin Dashboard',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  const superSession = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);
  const adminKey = cookieStore.get('admin_key')?.value;
  const isAuthenticated = session?.value === ADMIN_SESSION_VALUE;
  const isSuperAdmin = superSession?.value === SUPER_ADMIN_SESSION_VALUE;

  let adminLabel: string | null = null;
  if (!isSuperAdmin && adminKey) {
    const supabase = await createClient();
    const { data: adminConfig } = await supabase
      .from('config')
      .select('label')
      .eq('key', adminKey)
      .single();
    adminLabel = adminConfig?.label || null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {isAuthenticated && <AdminHeader isSuperAdmin={isSuperAdmin} adminLabel={adminLabel} />}

      <main style={{ flex: 1, padding: isAuthenticated ? '24px' : '0', width: '100%', margin: '0 auto' }}>
        {children}
      </main>

      {isAuthenticated && (
        <footer style={{ padding: '24px 32px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
          &copy; {new Date().getFullYear()} Westside Careers Admin. All rights reserved.
        </footer>
      )}
    </div>
  );
}
