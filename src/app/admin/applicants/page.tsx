'use client';

import { useState, useEffect } from 'react';
import { getApplicantsList } from '@/lib/actions/admin';
import type { Applicant } from '@/types';
import Link from 'next/link';

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplicantsList('').then((data) => {
      setApplicants(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' }}>Applicants</h1>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Reference No', 'Name', 'Position', 'Stage', 'Status', 'Result', 'Created'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applicants.slice(0, 100).map((app, idx) => (
                <tr key={app.reference_no} style={{ borderBottom: idx < applicants.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: '#8b1e2d', fontWeight: '600' }}>
                    <Link href={`/admin/applicants/${app.reference_no}`} style={{ color: '#8b1e2d', textDecoration: 'none' }}>
                      {app.reference_no}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#1f2937' }}>
                    {app.first_name} {app.last_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{app.position_applied}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{app.current_stage || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                      background: app.application_status === 'Passed' ? '#ecfdf3' : app.application_status === 'Failed' ? '#fef2f2' : '#f0f4ff',
                      color: app.application_status === 'Passed' ? '#166534' : app.application_status === 'Failed' ? '#991b1b' : '#163a70',
                    }}>{app.application_status || 'Pending'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{app.overall_result || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {applicants.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No applicants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}