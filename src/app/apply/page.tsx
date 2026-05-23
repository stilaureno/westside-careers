'use client';

import { useState, useEffect } from 'react';
import { submitApplication } from '@/lib/actions/applicant';
import { EXPERIENCE_LEVELS, ALLOWED_GAMES } from '@/types';
import Link from 'next/link';
import { PhotoBooth } from './PhotoBooth';
import { createClient } from '@/lib/supabase/client';
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
    lastName: '', firstName: '', middleName: '', preferredName: '',
    birthdate: '', gender: '', contactNumber: '',
    emailAddress: '', heightCm: '', weightKg: '',
    departmentId: '', positionApplied: '', secondaryPositionApplied: '', experienceLevel: '',
    currentlyEmployed: 'No', currentCompanyName: '',
    currentPosition: '', previousCompanyName: '',
    preferredDepartment: '', applicantNumber: '',
  });
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [games, setGames] = useState<string[]>([]);
  const [requiredGamesCount, setRequiredGamesCount] = useState(2);
  const [applicantNumberRequired, setApplicantNumberRequired] = useState(false);
  const [photoUploadEnabled, setPhotoUploadEnabled] = useState(true);
  const [photoUploadRequired, setPhotoUploadRequired] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [deptRes, configRes, applicantNumRes, photoUploadRes, photoUploadReqRes] = await Promise.all([
          fetch('/api/settings/departments'),
          fetch('/api/config/experienced-games-count'),
          fetch('/api/config/applicant-number-required'),
          createClient().from('config').select('value').eq('key', 'PHOTO_UPLOAD_ENABLED').single(),
          createClient().from('config').select('value').eq('key', 'PHOTO_UPLOAD_REQUIRED').single()
        ]);
        const deptData = await deptRes.json();
        const configData = await configRes.json();
        const applicantNumData = await applicantNumRes.json();
        setDepartments(deptData.departments || []);
        setPositions(deptData.positions || []);
        setRequiredGamesCount(configData.count || 2);
        setApplicantNumberRequired(applicantNumData.required || false);
        setPhotoUploadEnabled(photoUploadRes.data?.value !== 'false');
        setPhotoUploadRequired(photoUploadReqRes.data?.value === 'true');
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

    if (applicantNumberRequired && !form.applicantNumber.trim()) {
      setMessage({ text: 'Applicant Number is required.', type: 'error' });
      setLoading(false);
      return;
    }

    if (photoUploadRequired && !photoUrl) {
      setMessage({ text: 'Photo is required.', type: 'error' });
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

    if (isExperienced && games.length < requiredGamesCount) {
      setMessage({ text: `Please select at least ${requiredGamesCount} games.`, type: 'error' });
      setLoading(false);
      return;
    }

    const result = await submitApplication({
      lastName: form.lastName,
      firstName: form.firstName,
      middleName: form.middleName,
      preferredName: form.preferredName || undefined,
      birthdate: form.birthdate,
      gender: form.gender,
      contactNumber: form.contactNumber,
      emailAddress: form.emailAddress,
      heightCm: parseFloat(form.heightCm) || undefined,
      weightKg: parseFloat(form.weightKg) || undefined,
      department: selectedDept?.name || '',
      positionApplied: form.positionApplied,
      secondaryPositionApplied: form.secondaryPositionApplied || undefined,
      experienceLevel: form.experienceLevel,
      games: isExperienced ? games : undefined,
      currentlyEmployed: form.currentlyEmployed,
      currentCompanyName: isEmployed ? form.currentCompanyName : undefined,
      currentPosition: isEmployed ? form.currentPosition : undefined,
      previousCompanyName: form.previousCompanyName,
      preferredDepartment: form.preferredDepartment,
      applicantNumber: form.applicantNumber ? parseInt(form.applicantNumber, 10) : undefined,
      photoUrl: photoUrl || undefined,
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

          {photoUploadEnabled && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Photo</h3>
              <PhotoBooth onPhotoCapture={setPhotoUrl} />
            </section>
          )}

          <section className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Personal Information</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280' }}>Applicant Number{applicantNumberRequired ? ' *' : ''}</label>
                <input
                  style={{ 
                    width: '120px', 
                    padding: '6px 10px', 
                    fontSize: '13px', 
                    border: '2px solid #D4AF37', 
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                  type="text"
                  value={form.applicantNumber}
                  onChange={(e) => setForm({ ...form, applicantNumber: e.target.value })}
                  placeholder={applicantNumberRequired ? "Required" : "Optional"}
                  required={applicantNumberRequired}
                />
              </div>
            </div>
            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <FloatingInput
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                autoComplete="family-name"
                autoCapitalize="words"
                placeholder="Last Name"
                required
              />
              <FloatingInput
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                autoComplete="given-name"
                autoCapitalize="words"
                placeholder="First Name"
                required
              />
            </div>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <FloatingInput
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                autoComplete="additional-name"
                autoCapitalize="words"
                placeholder="Middle Name"
              />
              <FloatingInput
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                autoComplete="bday"
                placeholder="Birthdate"
                required
              />
            </div>

            <div className={styles.grid}>
              <FloatingInput
                value={form.preferredName}
                onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
                autoCapitalize="words"
                placeholder="Preferred Name"
              />
            </div>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <FloatingSelect
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                placeholder="Gender"
                required
              >
                <option>Male</option>
                <option>Female</option>
              </FloatingSelect>
              <FloatingInput
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                placeholder="Contact Number"
                required
              />
            </div>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <FloatingInput
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.emailAddress}
                onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                placeholder="Email Address"
                required
              />
              <div className={styles.compactGrid}>
                <FloatingInput
                  type="number"
                  inputMode="numeric"
                  step="0.1"
                  min="100"
                  max="250"
                  value={form.heightCm}
                  onChange={(e) => {
                    (e.target as HTMLInputElement).setCustomValidity('');
                    setForm({ ...form, heightCm: e.target.value });
                  }}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Your height must be in centimeters')}
                  placeholder="Height (cm)"
                  required
                />
                <FloatingInput
                  type="number"
                  inputMode="numeric"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  placeholder="Weight (kg)"
                  required
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Job Details</h3>
            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <FloatingSelect
                value={form.departmentId}
                onChange={(e) => {
                  setForm({ ...form, departmentId: e.target.value, positionApplied: '', experienceLevel: '' });
                  setGames([]);
                }}
                placeholder="Department"
                required
              >
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </FloatingSelect>
              <FloatingSelect
                value={form.positionApplied}
                onChange={(e) => {
                  setForm({ ...form, positionApplied: e.target.value, experienceLevel: '' });
                  setGames([]);
                }}
                placeholder="Position Applied"
                required
                disabled={!form.departmentId}
              >
                {positionOptions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </FloatingSelect>
            </div>

            <div className={styles.grid}>
              <FloatingSelect
                value={form.secondaryPositionApplied}
                onChange={(e) => setForm({ ...form, secondaryPositionApplied: e.target.value })}
                placeholder="Secondary Position (Optional)"
              >
                <option value="">None</option>
                {positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </FloatingSelect>
            </div>

            {isDealer && (
              <div className={styles.grid}>
                <FloatingSelect
                  value={form.experienceLevel}
                  onChange={(e) => {
                    setForm({ ...form, experienceLevel: e.target.value });
                    if (e.target.value !== 'Experienced Dealer') {
                      setGames([]);
                    }
                  }}
                  placeholder="Experience Level"
                  required
                >
                  {EXPERIENCE_LEVELS.map((experience) => <option key={experience} value={experience}>{experience}</option>)}
                </FloatingSelect>
              </div>
            )}

            {isExperienced && (
              <div className={styles.grid}>
                <p className={styles.gameHint}>Select at least {requiredGamesCount} games you are proficient in:</p>
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
              <FloatingSelect
                value={form.currentlyEmployed}
                onChange={(e) => setForm({ ...form, currentlyEmployed: e.target.value })}
                placeholder="Are you currently employed?"
                required
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </FloatingSelect>
            </div>

            {isEmployed && (
              <div className={`${styles.grid} ${styles.gridTwo}`}>
                <FloatingInput
                  value={form.currentCompanyName}
                  onChange={(e) => setForm({ ...form, currentCompanyName: e.target.value })}
                  autoComplete="organization"
                  placeholder="Current Company"
                />
                <FloatingInput
                  value={form.currentPosition}
                  onChange={(e) => setForm({ ...form, currentPosition: e.target.value })}
                  autoComplete="organization-title"
                  placeholder="Current Position"
                />
              </div>
            )}

            <div className={styles.grid}>
              <FloatingInput
                value={form.previousCompanyName}
                onChange={(e) => setForm({ ...form, previousCompanyName: e.target.value })}
                autoComplete="organization"
                placeholder="Previous Company"
              />
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

function FloatingInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  autoCapitalize,
  inputMode,
  step,
  min,
  max,
  onInvalid,
  disabled,
}: {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  autoCapitalize?: string;
  inputMode?: 'text' | 'search' | 'numeric' | 'email' | 'tel' | 'url' | 'none' | 'decimal';
  step?: string;
  min?: number | string;
  max?: number | string;
  onInvalid?: (e: React.FormEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value || type === 'date';

  return (
    <div className={`${styles.floatingWrap} ${float ? styles.floated : ''}`}>
      <input
        className={styles.control}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={float ? '' : placeholder}
        required={required}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        inputMode={inputMode}
        step={step}
        min={min}
        max={max}
        onInvalid={onInvalid}
        disabled={disabled}
      />
      <label className={styles.floatingLabel}>
        {placeholder}{required ? ' *' : ''}
      </label>
    </div>
  );
}

function FloatingSelect({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  children,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;

  return (
    <div className={`${styles.floatingWrap} ${float ? styles.floated : ''}`}>
      <select
        className={styles.control}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        disabled={disabled}
      >
        <option value=""></option>
        {children}
      </select>
      <label className={styles.floatingLabel}>{placeholder}</label>
    </div>
  );
}

