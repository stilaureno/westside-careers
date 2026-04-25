import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import { AdminHeader } from './header';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  const isAuthenticated = session?.value === ADMIN_SESSION_VALUE;

  // We need to know if we are on the login page.
  // In Server Components, we don't have usePathname, 
  // but we can check if we are rendering the login page by looking at the children or using a wrapper.
  // However, Next.js Layouts don't easily give you the current path.
  
  // A better way is to handle the redirect in the page itself or use a middleware.
  // But since we want to keep it simple, we'll check the session here.
  
  // Note: This layout wraps both /admin/login and /admin/dashboard.
  // If we redirect to /admin/login from here, we might get an infinite loop if not careful.
  
  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fc', display: 'flex', flexDirection: 'column' }}>
      {/* 
          We only show the header if authenticated. 
          The login page will be rendered as children. 
      */}
      {isAuthenticated && <AdminHeader />}

      <main style={{ flex: 1, padding: isAuthenticated ? '32px' : '0', width: '100%', margin: '0 auto' }}>
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
