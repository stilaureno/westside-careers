'use client';

import { useState } from 'react';
import { getApplicant } from '@/lib/actions/admin';

interface ListApplicant {
  reference_no: string;
  first_name: string;
  last_name: string;
  applicant_number: number | null;
}

export default function HrInterviewContent({ initialApplicants }: { initialApplicants: ListApplicant[] }) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [applicantData, setApplicantData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  async function openForm(referenceNo: string) {
    setLoading(true);
    setMessage(null);
    const res = await getApplicant(referenceNo, '');
    setLoading(false);
    if (!res.data) {
      setMessage({ text: res.error || 'Failed to load applicant.', type: 'error' });
      return;
    }
    setApplicantData(res.data);
    setMode('form');
  }

  function closeForm() {
    setMode('list');
    setApplicantData(null);
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
        Loading applicant data...
      </div>
    );
  }

  if (mode === 'form' && applicantData) {
    const applicant = applicantData.applicant;
    return (
      <div style={{ margin: '-24px', width: 'calc(100% + 48px)', minHeight: 'calc(100vh - 72px)', background: '#fff' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px', borderBottom: '1px solid #e5e7eb',
          background: '#001f3f',
        }}>
          <img
            src="/WESTSIDE LOGO WHITE.png"
            alt="Westside Careers"
            style={{ width: '120px', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>
              Candidate Interview Form
            </h1>
            <button
              type="button"
              onClick={closeForm}
              style={{
                padding: '8px 16px', background: 'transparent', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
                fontSize: '13px', cursor: 'pointer', fontWeight: '600',
              }}
            >
              ← Back to List
            </button>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>
            Applicant Information
          </h2>

          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#f3f4f6', padding: '10px 16px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Name</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>First Name</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Middle Name</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid #d1d5db', paddingLeft: '16px' }}>Preferred Name</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 16px' }}>
              <p style={{ fontSize: '15px', color: '#1f2937', margin: 0, fontWeight: '500' }}>{applicant.last_name || '-'}</p>
              <p style={{ fontSize: '15px', color: '#1f2937', margin: 0, fontWeight: '500' }}>{applicant.first_name || '-'}</p>
              <p style={{ fontSize: '15px', color: '#1f2937', margin: 0, fontWeight: '500' }}>{applicant.middle_name || '-'}</p>
              <p style={{ fontSize: '15px', color: '#1f2937', margin: 0, fontWeight: '500', borderLeft: '1px solid #d1d5db', paddingLeft: '16px' }}>{applicant.preferred_name || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: '14px', borderRadius: '12px', marginBottom: '16px',
          background: message.type === 'error' ? '#fef2f2' : '#ecfdf3',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#86efac'}`,
          color: message.type === 'error' ? '#991b1b' : '#166534', fontSize: '14px',
        }}>
          {message.text}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover table-sm mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Name
              </th>
              <th style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Applicant #
              </th>
            </tr>
          </thead>
          <tbody>
            {initialApplicants.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: '14px' }}>
                  No applicants found.
                </td>
              </tr>
            ) : (
              initialApplicants.map((app) => (
                <tr key={app.reference_no} style={{ cursor: 'pointer' }} onClick={() => openForm(app.reference_no)}>
                  <td style={{ fontSize: '14px', fontWeight: '600', color: '#000080' }}>
                    {app.last_name}, {app.first_name}
                  </td>
                  <td style={{ fontSize: '14px', color: '#6b7280' }}>
                    {app.applicant_number ?? '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
