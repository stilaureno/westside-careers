import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fc' }}>
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%238b1e2d'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'%3EWC%3C/text%3E%3C/svg%3E"
            alt="Logo"
            style={{ width: '50px', height: '50px', borderRadius: '10px' }}
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