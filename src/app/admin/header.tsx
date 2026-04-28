'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

export function AdminHeader({ isSuperAdmin, adminLabel }: { isSuperAdmin: boolean; adminLabel: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  
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
        background: '#fff', borderBottom: '1px solid #e5e7eb', 
        padding: isMobile ? '0 12px' : (isTablet ? '0 20px' : '0 32px'),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: isMobile ? '56px' : '72px', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        overflow: 'hidden', width: '100%', maxWidth: '100vw'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <img
            src="/WESTSIDE LOGO COLORED.png"
            alt="Logo"
            style={{ width: isMobile ? '36px' : '56px', height: isMobile ? '36px' : '56px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '800', color: '#8b1e2d', letterSpacing: '-0.025em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              Westside Careers
            </span>
            <span style={{ fontSize: isMobile ? '10px' : '12px', color: '#6b7280', fontWeight: '500', marginTop: '-2px', whiteSpace: 'nowrap' }}>
              {portalLabel}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ 
          display: 'flex', gap: isMobile ? '4px' : '8px', 
          background: '#f3f4f6', padding: '4px', 
          borderRadius: '12px',
          flexShrink: 0
        }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            disabled={isPending}
            style={{
              padding: isMobile ? '6px 12px' : '8px 20px',
              background: isDashboardRoute ? '#fff' : 'transparent',
              color: isDashboardRoute ? '#8b1e2d' : '#4b5563',
              borderRadius: '8px',
              fontSize: isMobile ? '12px' : '14px',
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
            {isPending && isDashboardRoute ? 'Loading...' : (isMobile ? 'Dash' : 'Dashboard')}
          </button>
          <button
            onClick={() => navigate('/admin/applicants')}
            disabled={isPending}
            style={{
              padding: isMobile ? '6px 12px' : '8px 20px',
              background: isApplicantsRoute ? '#fff' : 'transparent',
              color: isApplicantsRoute ? '#8b1e2d' : '#4b5563',
              borderRadius: '8px',
              fontSize: isMobile ? '12px' : '14px',
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

        <div style={{ display: 'flex', gap: isMobile ? '6px' : '12px', alignItems: 'center', flexShrink: 0 }}>
          {isSuperAdmin && !isMobile && (
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
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </a>
          )}
          <form action="/admin/logout" method="post">
            <button type="submit" style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px',
              padding: isMobile ? '6px 10px' : '8px 16px', background: '#fff', color: '#ef4444',
              border: '1px solid #fee2e2', borderRadius: '10px', fontSize: isMobile ? '12px' : '14px',
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
              {isMobile ? '' : 'Logout'}
            </button>
          </form>
        </div>
      </header>
    </>
  );
}