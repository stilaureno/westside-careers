'use client';

export default function Loading() {
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #8b1e2d',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ color: '#6b7280', marginTop: '16px', fontSize: '14px' }}>Loading applicant...</p>
    </div>
  );
}