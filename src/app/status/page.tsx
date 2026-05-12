'use client';

import { useEffect, useState, useRef } from 'react';
import { getApplicantStatus } from '@/lib/actions/applicant';
import type { StageRoadmapItem } from '@/types';
import Link from 'next/link';

type MathExamResult = {
  score: number | null;
  passed: boolean | null;
  takenAt: string | null;
  status: string | null;
};

export default function StatusPage() {
  const [form, setForm] = useState({ lastName: '', birthdate: '' });
  const [result, setResult] = useState<{ applicant: any; roadmap: StageRoadmapItem[]; mathExam: MathExamResult | null; nextStep: string | null } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
const [autoFetched, setAutoFetched] = useState(false);
  const [showExamWarning, setShowExamWarning] = useState(false);
  const [examWarningAcknowledged, setExamWarningAcknowledged] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(false);

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
    const savedLastName = localStorage.getItem('savedLastName');
    const savedDob = localStorage.getItem('savedBirthdate');
    if (savedLastName && savedDob) {
      setForm({ lastName: savedLastName, birthdate: savedDob });
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

      const res = await getApplicantStatus(form.lastName, form.birthdate);
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
  }, [autoFetched, rememberMe, form.lastName, form.birthdate]);

  function clearSavedInfo() {
    const confirmed = window.confirm(
      'This will delete your saved information from this device.\n\n' +
      'Please make sure to save your personal information so you can check your application status again later.\n\n' +
      'Click OK to continue, or Cancel to stay on this page.'
    );
    if (!confirmed) return;
    
    localStorage.removeItem('savedLastName');
    localStorage.removeItem('savedBirthdate');
    setForm({ lastName: '', birthdate: '' });
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

    const res = await getApplicantStatus(form.lastName, form.birthdate);
    if (res.error || !res.data) {
      setError(res.error || 'Applicant not found');
      setLockedUntil(res.lockedUntil || null);
    } else {
      setResult(res.data);
      setLockedUntil(null);
      if (rememberMe) {
        localStorage.setItem('savedLastName', form.lastName);
        localStorage.setItem('savedBirthdate', form.birthdate);
      }
    }
    setLoading(false);
  }

  const showForm = !result || loading;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #2b0f17 0%, #4a1521 26%, #6f1d2b 58%, #2b0f17 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px' }}>
          <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '6px' }}>Check Application Status</h1>
          <p style={{ color: '#b7c6df', fontSize: '15px' }}>
            {showForm ? 'Enter your last name and birthdate' : 'Your application status'}
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
                Last Name *
              </label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                placeholder="Enter your last name"
                autoComplete="family-name"
                autoCapitalize="words"
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
              width: '100%', padding: '14px', background: '#8b1e2d', color: '#fff',
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
            <div style={{ color: '#8b1e2d', fontSize: '16px' }}>Loading your status...</div>
          </div>
        )}

        {result && !loading && (
          <div style={{
            background: 'rgba(255,255,255,0.97)', borderRadius: '22px',
            boxShadow: '0 18px 42px rgba(4,12,24,.34)', padding: '28px',
            border: '1px solid rgba(212,175,55,.22)',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ color: '#8b1e2d', fontSize: '20px', marginBottom: '4px' }}>
                {result.applicant.last_name?.toUpperCase()}, {result.applicant.first_name}{result.applicant.middle_name ? ' ' + result.applicant.middle_name : ''}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                {result.applicant.position_applied} &middot; {result.applicant.reference_no}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{
                padding: '6px 14px', background: '#fbeaec', color: '#8b1e2d',
                borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              }}>{result.applicant.position_applied}</span>
            </div>

            {result.mathExam && (
              <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <h3 style={{ color: '#8b1e2d', fontSize: '15px', marginBottom: '12px' }}>Math Proficiency Exam</h3>
                {result.mathExam.status && result.mathExam.status !== 'IN_PROGRESS' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '24px', fontWeight: '800', color: result.mathExam.passed ? '#166534' : '#991b1b', margin: 0 }}>
                        {result.mathExam.score ?? 0}
                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>/10</span>
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                        {result.mathExam.passed ? 'PASSED' : 'FAILED'}
                        {result.mathExam.takenAt && (
                          <span style={{ color: '#9ca3af' }}> · {new Date(result.mathExam.takenAt).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>Not taken yet</p>
                  </div>
                )}
              </div>
            )}

            <h3 style={{ color: '#8b1e2d', fontSize: '16px', marginBottom: '12px' }}>Application Roadmap</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.roadmap.map((item, idx) => (
                <div key={item.stageName} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px',
                  background: item.status === 'completed' ? '#ecfdf3' : item.status === 'current' ? '#fffbeb' : '#f9fafb',
                  border: `2px solid ${item.status === 'completed' ? '#86efac' : item.status === 'current' ? '#fcd34d' : '#e5e7eb'}`,
                  position: 'relative',
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
                  </div>
                  <span style={{
                    fontSize: '12px', fontWeight: '600',
                    color: item.status === 'completed' ? '#166534' : item.status === 'current' ? '#d97706' : '#9ca3af',
                  }}>
                    {item.status === 'completed' 
                      ? (item.stageName === 'Initial Screening' ? 'Completed' : 'Done') 
                      : item.status === 'current' ? 'Current' : 'Pending'}
                  </span>
                  {item.stageName === 'Math Exam' && item.status === 'current' && (
                    <button
                      onClick={() => {
                        if (!examWarningAcknowledged) {
                          setShowExamWarning(true);
                        } else {
                          localStorage.setItem('examRef', result.applicant.reference_no);
                          window.location.href = '/exam';
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '8px 14px',
                        background: '#8b1e2d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Take Exam →
                    </button>
                  )}
                </div>
              ))}
            </div>

{result.nextStep && (result.applicant?.application_status === 'Completed' || result.applicant?.application_status === 'Passed') ? (
              <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: '0 0 8px' }}>
                  <span style={{ fontWeight: '600' }}>Next Step: </span>
                  {result.nextStep}
                </p>
                <a href="https://westsideresort.darwinbox.com/ms/candidatev2/main/auth_login" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', padding: '10px 16px', background: '#8b1e2d', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                  Open Darwinbox →
                </a>
              </div>
            ) : (
              <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  <span style={{ fontWeight: '600' }}>Next Step: </span>
                  {result.nextStep}
                </p>
              </div>
            )}

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

      {showExamWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '520px',
            width: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '22px', color: '#dc2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚠️ Important Exam Instructions
            </h2>
            
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#7f1d1d', fontWeight: '600' }}>
                ⚡ While taking the exam, you MUST:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#991b1b', lineHeight: '1.8' }}>
                <li><strong>Stay on this tab</strong> — do not switch to other browser tabs</li>
                <li><strong>Keep the browser window open</strong> — do not minimize or minimize to tray</li>
                <li><strong>Do not lock your screen</strong> or let your device sleep</li>
                <li><strong>Do not open other apps</strong> or switch to different windows</li>
                <li><strong>Activate &quot;Always On Display&quot;</strong> or extend your screen sleep timeout to maximum (30 min+) so your phone doesn&apos;t auto-lock</li>
              </ul>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#166534', fontWeight: '600' }}>
                📝 Math Exam Scope: <strong>10 questions</strong> | <strong>10 minutes</strong> time limit
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#14532d', lineHeight: '1.6' }}>
                <strong>Passing score: 8 out of 10</strong> (80%)
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#14532d', fontWeight: '600' }}>
                How to calculate percentages:
              </p>
              <ul style={{ margin: '0 0 12px', paddingLeft: '20px', fontSize: '12px', color: '#14532d', lineHeight: '1.8' }}>
                <li><strong>1.5% of a number:</strong> Multiply the number by 0.015 (or divide by 100, then multiply by 1.5)<br/>
                  <em>Example: 1.5% of 300 → 300 × 0.015 = <strong>4.5</strong></em><br/>
                  <em>Quick method: 300 ÷ 100 = 3 → 3 × 1.5 = <strong>4.5</strong></em></li>
                <li><strong>5% of a number:</strong> Multiply the number by 0.05 (or divide by 20)<br/>
                  <em>Example: 5% of 100 → 100 × 0.05 = <strong>5</strong></em><br/>
                  <em>Quick method: 100 ÷ 20 = <strong>5</strong></em></li>
              </ul>
              <p style={{ margin: 0, fontSize: '12px', color: '#166534', fontStyle: 'italic' }}>
                💡 <strong>Best tip:</strong> Move the decimal point two places left, then multiply by the percentage. For 1.5%, move decimal → 3.00 → multiply by 1.5 = 4.5. For 5%, just divide by 20!
              </p>
            </div>

            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="keepScreenOn"
                  checked={keepScreenOn}
                  onChange={(e) => setKeepScreenOn(e.target.checked)}
                  style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#8b1e2d' }}
                />
                <span style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.5' }}>
                  <strong>Keep my screen awake</strong> — Prevent screen from sleeping during the exam (requires permission)
                  <span style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Note: This may not work on all devices/browsers. If it doesn&apos;t work, please manually enable &quot;Always On Display&quot; or set your screen timeout to maximum in your device settings.</span>
                </span>
              </label>
            </div>

            <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#854d0e', fontWeight: '600' }}>
                🚨 If you switch tabs, minimize, lock screen, or open other apps, your exam will be <span style={{ textDecoration: 'underline' }}>automatically submitted</span> and only the questions you have already answered will be recorded.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={examWarningAcknowledged}
                  onChange={(e) => setExamWarningAcknowledged(e.target.checked)}
                  style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#8b1e2d' }}
                />
                <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                  I understand and agree to follow the exam rules. I acknowledge that any violation will result in automatic submission of my exam with only answered items recorded.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExamWarning(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                disabled={!examWarningAcknowledged}
                onClick={async () => {
                  if (keepScreenOn && typeof navigator !== 'undefined' && navigator.wakeLock) {
                    try {
                      await navigator.wakeLock.request('screen');
                    } catch (err) {
                      console.log('Wake lock not available:', err);
                    }
                  }
                  localStorage.setItem('examRef', result?.applicant?.reference_no || '');
                  localStorage.setItem('examKeepScreenOn', keepScreenOn ? 'true' : 'false');
                  setShowExamWarning(false);
                  window.location.href = '/exam';
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: examWarningAcknowledged ? '#8b1e2d' : '#9ca3af',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: examWarningAcknowledged ? 'pointer' : 'not-allowed',
                }}
              >
                I Understand — Proceed to Exam →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
