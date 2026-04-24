'use client';

import { useState } from 'react';
import { getApplicantStatus } from '@/lib/actions/applicant';
import type { StageRoadmapItem } from '@/types';
import Link from 'next/link';

export default function StatusPage() {
  const [form, setForm] = useState({ referenceNo: '', birthdate: '' });
  const [result, setResult] = useState<{ applicant: any; roadmap: StageRoadmapItem[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const res = await getApplicantStatus(form.referenceNo, form.birthdate);
    if (res.error || !res.data) {
      setError(res.error || 'Applicant not found');
    } else {
      setResult(res.data);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #08111f 0%, #0d1a2f 26%, #10213b 58%, #0a1424 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px' }}>
          <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '6px' }}>Check Application Status</h1>
          <p style={{ color: '#b7c6df', fontSize: '15px' }}>Enter your reference number and birthdate</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: '22px',
          boxShadow: '0 18px 42px rgba(4,12,24,.34)', padding: '28px',
          border: '1px solid rgba(212,175,55,.22)', marginBottom: '20px',
        }}>
          {error && (
            <div style={{
              padding: '14px', borderRadius: '12px', marginBottom: '16px',
              background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '14px',
            }}>{error}</div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              Reference Number *
            </label>
            <input
              value={form.referenceNo}
              onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
              required
              placeholder="APP-YYYYMMDDHHMMSS"
              style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              Birthdate *
            </label>
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: '#163a70', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
          }}>
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {result && (
          <div style={{
            background: 'rgba(255,255,255,0.97)', borderRadius: '22px',
            boxShadow: '0 18px 42px rgba(4,12,24,.34)', padding: '28px',
            border: '1px solid rgba(212,175,55,.22)',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ color: '#163a70', fontSize: '20px', marginBottom: '4px' }}>
                {result.applicant.first_name} {result.applicant.last_name}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                {result.applicant.position_applied} &middot; {result.applicant.reference_no}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{
                padding: '6px 14px', background: '#f0f4ff', color: '#163a70',
                borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              }}>{result.applicant.position_applied}</span>
              <span style={{
                padding: '6px 14px', background: result.applicant.application_status === 'Passed' ? '#ecfdf3' : '#fef2f2',
                color: result.applicant.application_status === 'Passed' ? '#166534' : '#991b1b',
                borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              }}>{result.applicant.application_status || 'Pending'}</span>
            </div>

            <h3 style={{ color: '#163a70', fontSize: '16px', marginBottom: '12px' }}>Application Roadmap</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.roadmap.map((item, idx) => (
                <div key={item.stageName} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px',
                  background: item.status === 'completed' ? '#ecfdf3' : item.status === 'current' ? '#fffbeb' : '#f9fafb',
                  border: `2px solid ${item.status === 'completed' ? '#86efac' : item.status === 'current' ? '#fcd34d' : '#e5e7eb'}`,
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700',
                    background: item.status === 'completed' ? '#166534' : item.status === 'current' ? '#d97706' : '#9ca3af',
                    color: '#fff', flexShrink: 0,
                  }}>
                    {item.status === 'completed' ? '✓' : item.status === 'current' ? idx + 1 : idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>{item.stageName}</p>
                    {item.result && (
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{item.result}</p>
                    )}
                  </div>
                  <span style={{
                    fontSize: '12px', fontWeight: '600',
                    color: item.status === 'completed' ? '#166534' : item.status === 'current' ? '#d97706' : '#9ca3af',
                  }}>
                    {item.status === 'completed' ? 'Done' : item.status === 'current' ? 'Current' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/" style={{ color: '#b7c6df', fontSize: '14px', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}