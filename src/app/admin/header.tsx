'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function AdminHeader({ isSuperAdmin, adminLabel }: { isSuperAdmin: boolean; adminLabel: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const isApplicantsRoute = pathname.startsWith('/admin/applicants');
  const isDashboardRoute = pathname === '/admin' || pathname.startsWith('/admin/dashboard');

  const portalLabel = isSuperAdmin ? 'Super Admin' : (adminLabel || 'Admin Portal');

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  const Spinner = () => (
    <span style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      border: '2px solid rgba(139, 30, 45, 0.3)',
      borderTopColor: '#8b1e2d',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      marginRight: '6px',
    }} />
  );

  return (
    <>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
            style={{ width: '56px', height: '56px', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#8b1e2d', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
              Westside Careers
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginTop: '-2px' }}>
              {portalLabel}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', gap: '8px', background: '#f3f4f6', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            disabled={isPending}
            style={{
              padding: '8px 20px',
              background: isDashboardRoute ? '#fff' : 'transparent',
              color: isDashboardRoute ? '#8b1e2d' : '#4b5563',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isPending ? 'wait' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              border: 'none',
              boxShadow: isDashboardRoute ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isPending && isDashboardRoute ? <Spinner /> : null}
            {isPending && isDashboardRoute ? 'Loading...' : 'Dashboard'}
          </button>
          <button
            onClick={() => navigate('/admin/applicants')}
            disabled={isPending}
            style={{
              padding: '8px 20px',
              background: isApplicantsRoute ? '#fff' : 'transparent',
              color: isApplicantsRoute ? '#8b1e2d' : '#4b5563',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isPending ? 'wait' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              border: 'none',
              boxShadow: isApplicantsRoute ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isPending && isApplicantsRoute ? <Spinner /> : null}
            {isPending && isApplicantsRoute ? 'Loading...' : 'Applicants'}
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isSuperAdmin && (
            <a
              href="/admin/settings"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', background: '#fff', color: '#4b5563',
                border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px',
                cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s',
                textDecoration: 'none',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </a>
          )}
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
        </div>
      </header>
    </>
  );
}