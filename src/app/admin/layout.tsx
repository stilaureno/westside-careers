'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === '/admin/login';
  const isApplicantsRoute = pathname.startsWith('/admin/applicants');
  const isDashboardRoute = pathname === '/admin' || pathname.startsWith('/admin/dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoginRoute) {
      setIsAuthorized(true);
      return;
    }
    const cookieStr = document.cookie;
    const hasValidSession = cookieStr.includes(ADMIN_SESSION_COOKIE + '=authenticated');
    if (!hasValidSession) {
      router.replace('/admin/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router, isLoginRoute]);

  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', background: '#f6f8fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #8b1e2d', 
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' 
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Verifying Session...</div>
        </div>
      </div>
    );
  }

  // If it's the login route, don't show the header/nav
  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fc', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Tabs */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '72px', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/WESTSIDE LOGO COLORED.png"
            alt="Logo"
            style={{ width: '44px', height: '44px', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#8b1e2d', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
              Westside Careers
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginTop: '-2px' }}>
              Administrative Portal
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', gap: '8px', background: '#f3f4f6', padding: '4px', borderRadius: '12px' }}>
          <Link
            href="/admin/dashboard"
            style={{
              padding: '8px 20px',
              background: isDashboardRoute ? '#fff' : 'transparent',
              color: isDashboardRoute ? '#8b1e2d' : '#4b5563',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              boxShadow: isDashboardRoute ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/applicants"
            style={{
              padding: '8px 20px',
              background: isApplicantsRoute ? '#fff' : 'transparent',
              color: isApplicantsRoute ? '#8b1e2d' : '#4b5563',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              boxShadow: isApplicantsRoute ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none',
            }}
          >
            Applicants
          </Link>
        </nav>

        <form action="/admin/logout" method="post">
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', background: '#fff', color: '#ef4444',
            border: '1px solid #fee2e2', borderRadius: '10px', fontSize: '14px',
            cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </form>
      </header>

      <main style={{ flex: 1, padding: '32px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>

      <footer style={{ padding: '24px 32px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
        &copy; {new Date().getFullYear()} Westside Careers Admin. All rights reserved.
      </footer>
    </div>
  );
}
