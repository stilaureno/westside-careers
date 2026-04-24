import { getDashboard } from '@/lib/actions/admin';
import type { DashboardSummary } from '@/types';

export default async function DashboardPage() {
  const summary = await getDashboard('');

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: summary.total, color: '#1f2937' },
          { label: 'Pending', value: summary.pending, color: '#6b7280' },
          { label: 'Ongoing', value: summary.ongoing, color: '#d97706' },
          { label: 'Qualified', value: summary.qualified, color: '#166534' },
          { label: 'Reprofile', value: summary.reprofile, color: '#7c3aed' },
          { label: 'Pooling', value: summary.pooling, color: '#0891b2' },
          { label: 'Failed', value: summary.failed, color: '#991b1b' },
        ].map((card) => (
          <div key={card.label} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
            padding: '16px', textAlign: 'center', minHeight: '88px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', lineHeight: 1.3 }}>{card.label}</p>
            <strong style={{ fontSize: '24px', color: card.color }}>{card.value}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>By Position</h3>
          {Object.entries(summary.byPosition).map(([pos, count]) => (
            <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>{pos}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{count}</span>
            </div>
          ))}
          {Object.keys(summary.byPosition).length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>No data</p>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>By Gender</h3>
          {Object.entries(summary.byGender).map(([gender, count]) => (
            <div key={gender} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>{gender}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{count}</span>
            </div>
          ))}
          {Object.keys(summary.byGender).length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>No data</p>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>By Age Band</h3>
          {Object.entries(summary.byAgeBand).map(([band, count]) => (
            <div key={band} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>{band}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{count}</span>
            </div>
          ))}
          {Object.keys(summary.byAgeBand).length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>No data</p>
          )}
        </div>
      </div>
    </div>
  );
}