'use client';

import { useState, useEffect } from 'react';
import { submitApplication } from '@/lib/actions/applicant';
import { POSITIONS, EXPERIENCE_LEVELS, ALLOWED_GAMES } from '@/types';
import Link from 'next/link';

export default function ApplyPage() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    lastName: '', firstName: '', middleName: '',
    birthdate: '', gender: '', contactNumber: '',
    emailAddress: '', heightCm: '', weightKg: '',
    positionApplied: '', experienceLevel: '',
    currentlyEmployed: 'No', currentCompanyName: '',
    currentPosition: '', previousCompanyName: '',
    preferredDepartment: '',
  });
  const [games, setGames] = useState<string[]>([]);

  const isDealer = form.positionApplied === 'Dealer';
  const isExperienced = form.experienceLevel === 'Experienced Dealer';
  const isEmployed = form.currentlyEmployed === 'Yes';

  useEffect(() => {
    const h = parseFloat(form.heightCm);
    const w = parseFloat(form.weightKg);
    if (h > 0 && w > 0) {
      const bmi = Math.round((w / ((h / 100) * (h / 100))) * 100) / 100;
      setForm((f) => ({ ...f, heightCm: form.heightCm }));
    }
  }, [form.heightCm, form.weightKg]);

  function toggleGame(code: string) {
    setGames((prev) =>
      prev.includes(code) ? prev.filter((g) => g !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!form.lastName || !form.firstName || !form.birthdate || !form.gender || !form.contactNumber || !form.positionApplied) {
      setMessage({ text: 'Please fill in all required fields.', type: 'error' });
      setLoading(false);
      return;
    }

    if (isDealer && !form.experienceLevel) {
      setMessage({ text: 'Please select your experience level.', type: 'error' });
      setLoading(false);
      return;
    }

    if (isExperienced && games.length < 2) {
      setMessage({ text: 'Please select at least 2 games.', type: 'error' });
      setLoading(false);
      return;
    }

    const result = await submitApplication({
      lastName: form.lastName,
      firstName: form.firstName,
      middleName: form.middleName,
      birthdate: form.birthdate,
      gender: form.gender,
      contactNumber: form.contactNumber,
      emailAddress: form.emailAddress,
      heightCm: parseFloat(form.heightCm) || undefined,
      weightKg: parseFloat(form.weightKg) || undefined,
      positionApplied: form.positionApplied,
      experienceLevel: form.experienceLevel,
      games: isExperienced ? games : undefined,
      currentlyEmployed: form.currentlyEmployed,
      currentCompanyName: isEmployed ? form.currentCompanyName : undefined,
      currentPosition: isEmployed ? form.currentPosition : undefined,
      previousCompanyName: form.previousCompanyName,
      preferredDepartment: form.preferredDepartment,
    });

    if (result.success) {
      setReferenceNo(result.referenceNo || '');
      setStep('success');
    } else {
      setMessage({ text: result.error || 'Submission failed. Please try again.', type: 'error' });
    }
    setLoading(false);
  }

  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #08111f 0%, #0d1a2f 26%, #10213b 58%, #0a1424 100%)',
        padding: '20px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: '22px', padding: '40px',
          maxWidth: '520px', width: '100%', textAlign: 'center',
          boxShadow: '0 18px 42px rgba(4,12,24,.34)', border: '1px solid rgba(212,175,55,.22)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#163a70', fontSize: '24px', marginBottom: '8px' }}>Application Submitted!</h2>
          <p style={{ color: '#555', marginBottom: '16px' }}>Your application has been received.</p>
          <div style={{
            background: '#ecfdf3', border: '1px solid #86efac', borderRadius: '14px',
            padding: '16px', marginBottom: '16px',
          }}>
            <p style={{ color: '#166534', fontSize: '13px', marginBottom: '6px' }}>Your Reference Number:</p>
            <p style={{ color: '#166534', fontSize: '22px', fontWeight: '700', margin: 0 }}>{referenceNo}</p>
          </div>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
            Please save your reference number to check your application status.
          </p>
          <Link href="/status" style={{
            display: 'block', padding: '14px 24px', background: '#163a70', color: '#fff',
            borderRadius: '12px', fontWeight: '700', textDecoration: 'none', fontSize: '15px',
          }}>
            Check Application Status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #08111f 0%, #0d1a2f 26%, #10213b 58%, #0a1424 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px' }}>
          <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '6px' }}>Westside Resort</h1>
          <p style={{ color: '#b7c6df', fontSize: '15px' }}>Table Games Hiring Portal — Apply Now</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: '22px',
          boxShadow: '0 18px 42px rgba(4,12,24,.34)', padding: '28px',
          border: '1px solid rgba(212,175,55,.22)',
        }}>
          {message && (
            <div style={{
              padding: '14px', borderRadius: '12px', marginBottom: '16px',
              background: message.type === 'success' ? '#ecfdf3' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
              color: message.type === 'success' ? '#166534' : '#991b1b',
              fontSize: '14px',
            }}>{message.text}</div>
          )}

          <h3 style={{ color: '#163a70', marginBottom: '16px', fontSize: '18px' }}>Personal Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Field label="Last Name *" required>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </Field>
            <Field label="First Name *" required>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Field label="Middle Name">
              <input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
            </Field>
            <Field label="Birthdate *" required>
              <input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} required />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Field label="Gender *" required>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </Field>
            <Field label="Contact Number *" required>
              <input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} required placeholder="09XXXXXXXXX" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Field label="Email Address">
              <input type="email" value={form.emailAddress} onChange={(e) => setForm({ ...form, emailAddress: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Field label="Height (cm)">
                <input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} placeholder="cm" />
              </Field>
              <Field label="Weight (kg)">
                <input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} placeholder="kg" />
              </Field>
            </div>
          </div>

          <h3 style={{ color: '#163a70', marginBottom: '16px', marginTop: '24px', fontSize: '18px' }}>Job Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Field label="Position Applied *" required>
              <select value={form.positionApplied} onChange={(e) => setForm({ ...form, positionApplied: e.target.value, experienceLevel: '' })} required>
                <option value="">Select Position</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Preferred Department">
              <input value={form.preferredDepartment} onChange={(e) => setForm({ ...form, preferredDepartment: e.target.value })} />
            </Field>
          </div>

          {isDealer && (
            <div style={{ marginBottom: '16px' }}>
              <Field label="Experience Level *" required>
                <select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })} required>
                  <option value="">Select Experience</option>
                  {EXPERIENCE_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
            </div>
          )}

          {isExperienced && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Select at least 2 games you are proficient in:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {ALLOWED_GAMES.map((game) => (
                  <label key={game} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px',
                    border: `2px solid ${games.includes(game) ? '#163a70' : '#e5e7eb'}`,
                    borderRadius: '10px', cursor: 'pointer', fontSize: '13px',
                    background: games.includes(game) ? '#f0f4ff' : '#fff',
                    color: games.includes(game) ? '#163a70' : '#1f2937',
                    fontWeight: games.includes(game) ? '700' : '400',
                  }}>
                    <input type="checkbox" checked={games.includes(game)} onChange={() => toggleGame(game)} style={{ width: 'auto' }} />
                    {game}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <Field label="Are you currently employed? *" required>
              <select value={form.currentlyEmployed} onChange={(e) => setForm({ ...form, currentlyEmployed: e.target.value })} required>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </Field>
          </div>

          {isEmployed && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <Field label="Current Company">
                <input value={form.currentCompanyName} onChange={(e) => setForm({ ...form, currentCompanyName: e.target.value })} />
              </Field>
              <Field label="Current Position">
                <input value={form.currentPosition} onChange={(e) => setForm({ ...form, currentPosition: e.target.value })} />
              </Field>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <Field label="Previous Company">
              <input value={form.previousCompanyName} onChange={(e) => setForm({ ...form, previousCompanyName: e.target.value })} />
            </Field>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: '#163a70', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
          }}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}