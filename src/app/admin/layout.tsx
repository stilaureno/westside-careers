import { NextResponse } from 'next/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fc' }}>
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/WESTSIDE LOGO COLORED.png"
            alt="Logo"
            style={{ width: '50px', height: '50px' }}
          />
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#8b1e2d' }}>Westside Careers Admin</span>
        </div>
        <form action="/admin/logout" method="post">
          <button type="submit" style={{
            padding: '8px 16px', background: '#fff', color: '#1f2937',
            border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px',
            cursor: 'pointer', fontWeight: '600',
          }}>Logout</button>
        </form>
      </div>
      {children}
    </div>
  );
}