'use client';

import { useEffect, useState, useRef } from 'react';
import { getApplicantStatus } from '@/lib/actions/applicant';
import type { StageRoadmapItem } from '@/types';
import Link from 'next/link';

export default function StatusPage() {
  const [form, setForm] = useState({ referenceNo: '', birthdate: '' });
  const [result, setResult] = useState<{ applicant: any; roadmap: StageRoadmapItem[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
const [autoFetched, setAutoFetched] = useState(false);

  useEffect(() => {
    if (!lockedUntil) return;

    const timer = window.setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setError('');
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const isLocked = !!lockedUntil && lockedUntil > Date.now();

  useEffect(() => {
    const savedRef = localStorage.getItem('savedReferenceNo');
    const savedDob = localStorage.getItem('savedBirthdate');
    if (savedRef && savedDob) {
      setForm({ referenceNo: savedRef, birthdate: savedDob });
      setRememberMe(true);
      setAutoFetched(true);
    }
  }, []);

  // Auto-fetch status on first load if saved credentials exist
  useEffect(() => {
    if (!autoFetched || !rememberMe) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');

      const res = await getApplicantStatus(form.referenceNo, form.birthdate);
      if (res.error || !res.data) {
        setError(res.error || 'Applicant not found');
        setLockedUntil(res.lockedUntil || null);
      } else {
        setResult(res.data);
        setLockedUntil(null);
      }
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [autoFetched, rememberMe, form.referenceNo, form.birthdate]);

  function clearSavedInfo() {
    localStorage.removeItem('savedReferenceNo');
    localStorage.removeItem('savedBirthdate');
    setForm({ referenceNo: '', birthdate: '' });
    setRememberMe(false);
    setResult(null);
    setError('');
  }

  function formatLockCountdown(until: number) {
    const remainingMs = Math.max(until - Date.now(), 0);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;

    setLoading(true);
    setError('');
    setResult(null);

    const res = await getApplicantStatus(form.referenceNo, form.birthdate);
    if (res.error || !res.data) {
      setError(res.error || 'Applicant not found');
      setLockedUntil(res.lockedUntil || null);
    } else {
      setResult(res.data);
      setLockedUntil(null);
      if (rememberMe) {
        localStorage.setItem('savedReferenceNo', form.referenceNo);
        localStorage.setItem('savedBirthdate', form.birthdate);
      }
    }
    setLoading(false);
  }

  const showForm = !result || loading;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #08111f 0%, #0d1a2f 26%, #10213b 58%, #0a1424 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px' }}>
          <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '6px' }}>Check Application Status</h1>
          <p style={{ color: '#b7c6df', fontSize: '15px' }}>
            {showForm ? 'Enter your reference number and birthdate' : 'Your application status'}
          </p>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'rgba(255,255,255,0.97)', borderRadius: '22px',
            boxShadow: '0 18px 42px rgba(4,12,24,.34)', padding: '28px',
            border: '1px solid rgba(212,175,55,.22)', marginBottom: '20px',
          }}>
            {error && (
              <div style={{
                padding: '14px', borderRadius: '12px', marginBottom: '16px',
                background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '14px',
              }}>
                <div>{error}</div>
                {isLocked && lockedUntil && (
                  <div style={{ marginTop: '8px', fontWeight: '700' }}>
                    Locked for: {formatLockCountdown(lockedUntil)}
                  </div>
                )}
              </div>
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
                autoComplete="off"
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
                max={new Date().toISOString().split('T')[0]}
                autoComplete="bday"
                style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', color: '#4b5563' }}>Remember this device</span>
            </label>
            {rememberMe && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={clearSavedInfo}
                  style={{
                    background: 'none', border: 'none', color: '#6b7280', fontSize: '13px',
                    cursor: 'pointer', textDecoration: 'underline', padding: 0, marginTop: '4px',
                  }}
                >
                  Clear saved info
                </button>
              </div>
            )}
            <button type="submit" disabled={loading || isLocked} style={{
              width: '100%', padding: '14px', background: '#163a70', color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
              cursor: loading || isLocked ? 'not-allowed' : 'pointer', opacity: loading || isLocked ? 0.65 : 1,
            }}>
              {loading ? 'Checking...' : isLocked ? 'Temporarily Locked' : 'Check Status'}
            </button>
          </form>
        )}

        {loading && (
          <div style={{
            background: 'rgba(255,255,255,0.97)', borderRadius: '22px',
            boxShadow: '0 18px 42px rgba(4,12,24,.34)', padding: '40px',
            border: '1px solid rgba(212,175,55,.22)', textAlign: 'center',
          }}>
            <div style={{ color: '#163a70', fontSize: '16px' }}>Loading your status...</div>
          </div>
        )}

        {result && !loading && (
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
                    {item.status === 'completed' ? '✓' : idx + 1}
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

            {rememberMe && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={clearSavedInfo}
                  style={{
                    background: 'none', border: 'none', color: '#6b7280', fontSize: '13px',
                    cursor: 'pointer', textDecoration: 'underline', padding: 0,
                  }}
                >
                  Check different application
                </button>
              </div>
            )}
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