'use client';

import { useState } from 'react';
import { getApplicant, saveHrInterviewFields } from '@/lib/actions/admin';

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
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [hrForm, setHrForm] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    preferredName: '',
    positionBeingConsidered: '',
    secondaryPositionBeingConsidered: '',
    expectedSalary: '',
    dateOfAvailability: '',
  });

  async function openForm(referenceNo: string) {
    setLoading(true);
    setMessage(null);
    const res = await getApplicant(referenceNo, '');
    setLoading(false);
    if (!res.data) {
      setMessage({ text: res.error || 'Failed to load applicant.', type: 'error' });
      return;
    }
    const app = res.data.applicant;
    setApplicantData(res.data);
    setHrForm({
      lastName: app.last_name || '',
      firstName: app.first_name || '',
      middleName: app.middle_name || '',
      preferredName: app.preferred_name || '',
      positionBeingConsidered: app.position_being_considered || app.position_applied || '',
      secondaryPositionBeingConsidered: app.secondary_position_applied || '',
      expectedSalary: app.expected_salary || '',
      dateOfAvailability: app.date_of_availability || '',
    });
    setMode('form');
  }

  function closeForm() {
    setMode('list');
    setApplicantData(null);
  }

  async function handleSave() {
    if (!applicantData) return;
    setSaving(true);
    setMessage(null);
    const res = await saveHrInterviewFields(
      applicantData.applicant.reference_no,
      hrForm,
      ''
    );
    setSaving(false);
    if (res.success) {
      setMessage({ text: 'HR Interview fields saved successfully!', type: 'success' });
    } else {
      setMessage({ text: res.error || 'Failed to save.', type: 'error' });
    }
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

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#f3f4f6', padding: '10px 16px', borderRadius: '8px 8px 0 0' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Name</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>First Name</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Middle Name</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferred Name</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px 16px', borderRadius: '0 0 8px 8px' }}>
              <div>
                <input
                  type="text"
                  value={hrForm.lastName}
                  onChange={(e) => setHrForm({ ...hrForm, lastName: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', fontWeight: '500',
                  }}
                  placeholder="Last Name"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={hrForm.firstName}
                  onChange={(e) => setHrForm({ ...hrForm, firstName: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', fontWeight: '500',
                  }}
                  placeholder="First Name"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={hrForm.middleName}
                  onChange={(e) => setHrForm({ ...hrForm, middleName: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', fontWeight: '500',
                  }}
                  placeholder="Middle Name"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={hrForm.preferredName}
                  onChange={(e) => setHrForm({ ...hrForm, preferredName: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', fontWeight: '500',
                  }}
                  placeholder="Preferred Name"
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px 0' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={hrForm.positionBeingConsidered}
                  onChange={(e) => setHrForm({ ...hrForm, positionBeingConsidered: e.target.value })}
                  onFocus={() => setFocusedField('position')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: '100%', padding: '16px 10px 4px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <label style={{
                  position: 'absolute', left: '10px', top: focusedField === 'position' || hrForm.positionBeingConsidered ? '4px' : '50%',
                  transform: 'translateY(-50%)',
                  fontSize: focusedField === 'position' || hrForm.positionBeingConsidered ? '11px' : '14px',
                  color: '#6b7280', pointerEvents: 'none', transition: 'all 0.15s ease',
                  lineHeight: 1,
                }}>
                  Position being considered for:
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={hrForm.secondaryPositionBeingConsidered}
                  onChange={(e) => setHrForm({ ...hrForm, secondaryPositionBeingConsidered: e.target.value })}
                  onFocus={() => setFocusedField('secondaryPosition')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: '100%', padding: '16px 10px 4px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <label style={{
                  position: 'absolute', left: '10px', top: focusedField === 'secondaryPosition' || hrForm.secondaryPositionBeingConsidered ? '4px' : '50%',
                  transform: 'translateY(-50%)',
                  fontSize: focusedField === 'secondaryPosition' || hrForm.secondaryPositionBeingConsidered ? '11px' : '14px',
                  color: '#6b7280', pointerEvents: 'none', transition: 'all 0.15s ease',
                  lineHeight: 1,
                }}>
                  Secondary position being considered:
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={hrForm.expectedSalary}
                  onChange={(e) => setHrForm({ ...hrForm, expectedSalary: e.target.value })}
                  onFocus={() => setFocusedField('salary')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: '100%', padding: '16px 10px 4px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <label style={{
                  position: 'absolute', left: '10px', top: focusedField === 'salary' || hrForm.expectedSalary ? '4px' : '50%',
                  transform: 'translateY(-50%)',
                  fontSize: focusedField === 'salary' || hrForm.expectedSalary ? '11px' : '14px',
                  color: '#6b7280', pointerEvents: 'none', transition: 'all 0.15s ease',
                  lineHeight: 1,
                }}>
                  Expected salary:
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={hrForm.dateOfAvailability}
                  onChange={(e) => setHrForm({ ...hrForm, dateOfAvailability: e.target.value })}
                  onFocus={() => setFocusedField('availability')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: '100%', padding: '16px 10px 4px', border: '1px solid #d1d5db',
                    borderRadius: '6px', fontSize: '14px', color: '#1f2937', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <label style={{
                  position: 'absolute', left: '10px', top: focusedField === 'availability' || hrForm.dateOfAvailability ? '4px' : '50%',
                  transform: 'translateY(-50%)',
                  fontSize: focusedField === 'availability' || hrForm.dateOfAvailability ? '11px' : '14px',
                  color: '#6b7280', pointerEvents: 'none', transition: 'all 0.15s ease',
                  lineHeight: 1,
                }}>
                  Date of availability to start (tentative):
                </label>
              </div>
            </div>
          </div>

          {message && (
            <div style={{
              padding: '14px', borderRadius: '12px', marginTop: '16px',
              background: message.type === 'success' ? '#ecfdf3' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
              color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px',
            }}>
              {message.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: '16px', padding: '12px 32px', background: '#000080', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
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
