'use client';

import { useState, useEffect } from 'react';
import { submitApplication } from '@/lib/actions/applicant';
import { EXPERIENCE_LEVELS, ALLOWED_GAMES } from '@/types';
import Link from 'next/link';
import styles from './apply.module.css';

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  department_id: string;
  name: string;
}

export default function ApplyPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    lastName: '', firstName: '', middleName: '',
    birthdate: '', gender: '', contactNumber: '',
    emailAddress: '', heightCm: '', weightKg: '',
    departmentId: '', positionApplied: '', experienceLevel: '',
    currentlyEmployed: 'No', currentCompanyName: '',
    currentPosition: '', previousCompanyName: '',
    preferredDepartment: '',
  });
  const [games, setGames] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/settings/departments');
        const data = await res.json();
        setDepartments(data.departments || []);
        setPositions(data.positions || []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  const selectedDept = departments.find(d => d.id === form.departmentId);
  const positionOptions = positions.filter(p => p.department_id === form.departmentId);

  const isDealer = form.positionApplied === 'Dealer';
  const isExperienced = form.experienceLevel === 'Experienced Dealer';
  const isEmployed = form.currentlyEmployed === 'Yes';

  function toggleGame(code: string) {
    setGames((prev) =>
      prev.includes(code) ? prev.filter((g) => g !== code) : [...prev, code]
    );
  }

  async function handleCopyReference() {
    if (!referenceNo) return;

    try {
      await navigator.clipboard.writeText(referenceNo);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2500);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!form.lastName || !form.firstName || !form.birthdate || !form.gender || !form.contactNumber || !form.departmentId) {
      setMessage({ text: 'Please fill in all required fields.', type: 'error' });
      setLoading(false);
      return;
    }

    function checkAge(birthdate: string): number {
      const today = new Date();
      const birth = new Date(birthdate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }

    if (checkAge(form.birthdate) < 21) {
      setMessage({ text: 'You must be at least 21 years old to apply.', type: 'error' });
      setLoading(false);
      return;
    }

    if (!form.positionApplied) {
      setMessage({ text: 'Please select a position.', type: 'error' });
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
      department: selectedDept?.name || '',
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
      try {
        localStorage.setItem('savedReferenceNo', result.referenceNo || '');
        localStorage.setItem('savedBirthdate', form.birthdate);
      } catch {
        // Ignore storage failures so submission success is not blocked.
      }

      setReferenceNo(result.referenceNo || '');
      setCopyState('idle');
      setStep('success');
      return;
    }

    setMessage({ text: result.error || 'Submission failed. Please try again.', type: 'error' });
    setLoading(false);
  }

  if (loadingData) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <p className={styles.message}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={styles.successWrap}>
        <div className={`${styles.card} ${styles.successCard}`}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={styles.successTitle}>Application Submitted!</h2>
          <p className={styles.successText}>Your application has been received.</p>
          <button
            type="button"
            className={styles.referenceBox}
            onClick={handleCopyReference}
            aria-label="Copy reference number"
          >
            <p className={styles.referenceLabel}>Your Reference Number:</p>
            <p className={styles.referenceValue}>{referenceNo}</p>
            <p className={styles.referenceNote}>Click to copy your Reference No.</p>
            {copyState === 'copied' && (
              <p className={styles.referenceFeedback}>Copied to clipboard.</p>
            )}
            {copyState === 'error' && (
              <p className={styles.referenceFeedback}>Copy failed. Please copy it manually.</p>
            )}
          </button>
          <p className={styles.successHint}>
            Your reference number and birthdate were saved on this device, so the status page can load faster.
          </p>
          <Link href="/status" className={`${styles.button} ${styles.linkButton}`}>
            Check Application Status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <img
          src="/WESTSIDE LOGO WHITE.png"
          alt="Westside Careers Logo"
          style={{ width: '160px', margin: '0 auto 24px', display: 'block' }}
        />
        <form onSubmit={handleSubmit} className={`${styles.card} ${styles.formCard}`}>
          {message && (
            <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
              {message.text}
            </div>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Personal Information</h3>
            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <Field label="Last Name" required>
                <input
                  className={styles.control}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  autoComplete="family-name"
                  autoCapitalize="words"
                  required
                />
              </Field>
              <Field label="First Name" required>
                <input
                  className={styles.control}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  autoComplete="given-name"
                  autoCapitalize="words"
                  required
                />
              </Field>
            </div>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <Field label="Middle Name">
                <input
                  className={styles.control}
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                  autoComplete="additional-name"
                  autoCapitalize="words"
                />
              </Field>
              <Field label="Birthdate" required>
                <input
                  className={styles.control}
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                  autoComplete="bday"
                  required
                />
              </Field>
            </div>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <Field label="Gender" required>
                <select
                  className={styles.control}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  required
                >
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>
              <Field label="Contact Number" required>
                <input
                  className={styles.control}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  required
                  placeholder="09XXXXXXXXX"
                />
              </Field>
            </div>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <Field label="Email Address">
                <input
                  className={styles.control}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.emailAddress}
                  onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                />
              </Field>
              <div className={styles.compactGrid}>
                <Field label="Height (cm)">
                  <input
                    className={styles.control}
                    type="number"
                    inputMode="numeric"
                    step="0.1"
                    value={form.heightCm}
                    onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                    placeholder="cm"
                  />
                </Field>
                <Field label="Weight (kg)">
                  <input
                    className={styles.control}
                    type="number"
                    inputMode="numeric"
                    step="0.1"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    placeholder="kg"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Job Details</h3>
            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <Field label="Department" required>
                <select
                  className={styles.control}
                  value={form.departmentId}
                  onChange={(e) => {
                    setForm({ ...form, departmentId: e.target.value, positionApplied: '', experienceLevel: '' });
                    setGames([]);
                  }}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Position Applied" required>
                <select
                  className={styles.control}
                  value={form.positionApplied}
                  onChange={(e) => {
                    setForm({ ...form, positionApplied: e.target.value, experienceLevel: '' });
                    setGames([]);
                  }}
                  required
                  disabled={!form.departmentId}
                >
                  <option value="">Select Position</option>
                  {positionOptions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
            </div>

            {isDealer && (
              <div className={styles.grid}>
                <Field label="Experience Level" required>
                  <select
                    className={styles.control}
                    value={form.experienceLevel}
                    onChange={(e) => {
                      setForm({ ...form, experienceLevel: e.target.value });
                      if (e.target.value !== 'Experienced Dealer') {
                        setGames([]);
                      }
                    }}
                    required
                  >
                    <option value="">Select Experience</option>
                    {EXPERIENCE_LEVELS.map((experience) => <option key={experience} value={experience}>{experience}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {isExperienced && (
              <div className={styles.grid}>
                <p className={styles.gameHint}>Select at least 2 games you are proficient in:</p>
                <div className={styles.gameGrid}>
                  {ALLOWED_GAMES.map((game) => (
                    <label
                      key={game}
                      className={`${styles.gameOption} ${games.includes(game) ? styles.gameOptionSelected : ''}`}
                    >
                      <input
                        className={styles.gameCheckbox}
                        type="checkbox"
                        checked={games.includes(game)}
                        onChange={() => toggleGame(game)}
                      />
                      {game}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.grid}>
              <Field label="Are you currently employed?" required>
                <select
                  className={styles.control}
                  value={form.currentlyEmployed}
                  onChange={(e) => setForm({ ...form, currentlyEmployed: e.target.value })}
                  required
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </Field>
            </div>

            {isEmployed && (
              <div className={`${styles.grid} ${styles.gridTwo}`}>
                <Field label="Current Company">
                  <input
                    className={styles.control}
                    value={form.currentCompanyName}
                    onChange={(e) => setForm({ ...form, currentCompanyName: e.target.value })}
                    autoComplete="organization"
                  />
                </Field>
                <Field label="Current Position">
                  <input
                    className={styles.control}
                    value={form.currentPosition}
                    onChange={(e) => setForm({ ...form, currentPosition: e.target.value })}
                    autoComplete="organization-title"
                  />
                </Field>
              </div>
            )}

            <div className={styles.grid}>
              <Field label="Previous Company">
                <input
                  className={styles.control}
                  value={form.previousCompanyName}
                  onChange={(e) => setForm({ ...form, previousCompanyName: e.target.value })}
                  autoComplete="organization"
                />
              </Field>
            </div>
          </section>

          <button type="submit" disabled={loading} className={`${styles.button} ${styles.primaryButton}`}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>

          <div className={styles.footerLinkWrap}>
            <Link href="/" className={styles.footerLink}>← Back to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}
