'use client';

import { useState } from 'react';
import { renderFormattedMessage } from '@/components/formatted-message';
import { getApplicant, updateStage } from '@/lib/actions/admin';
import type { Applicant } from '@/types';
import { useRouter } from 'next/navigation';

export default function DetailContent({ initialData }: { initialData: any }) {
  const [data, setData] = useState<any>(initialData);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');
  const [stageSeq, setStageSeq] = useState(1);
  const [resultStatus, setResultStatus] = useState('Passed');
  const [stageLabel, setStageLabel] = useState('');
  const [form, setForm] = useState<any>({});
  const router = useRouter();

  function handleStageChange(stageName: string) {
    setStage(stageName);
    setStageSeq(getStageSeq(stageName, data?.applicant));
    updateFormFields(stageName, data?.applicant);
  }

  function getStageSeq(stageName: string, app: Applicant): number {
    const workflow = getWorkflow(app?.position_applied, app?.experience_level);
    return workflow.indexOf(stageName) + 1;
  }

  function getWorkflow(position: string | undefined, exp: string | undefined): string[] {
    if (position === 'Dealer') {
      return exp === 'Experienced Dealer'
        ? ['Initial Screening', 'Math Exam', 'Table Test', 'Final Interview']
        : ['Initial Screening', 'Math Exam', 'Final Interview'];
    }
    if (['Pit Supervisor', 'Pit Manager', 'Operations Manager'].includes(position || '')) {
      return ['Initial Screening', 'Final Interview'];
    }
    return ['Initial Screening'];
  }

  function updateFormFields(stageName: string, app: Applicant) {
    setForm({
      heightCm: app?.height_cm || '',
      weightKg: app?.weight_kg || '',
      bmiValue: app?.bmi_value || '',
      bmiResult: 'Passed',
      colorBlindResult: 'Passed',
      visibleTattoo: 'No',
      invisibleTattoo: 'No',
      sweatyPalmResult: 'Passed',
      score: '',
      passingScore: 8,
      maxScore: 10,
      remarks: '',
      evaluatedBy: 'HR',
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!stage) {
      setMessage({ text: 'Please select a stage.', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage(null);

    const res = await updateStage({
      referenceNo: data.applicant.reference_no,
      stageName: stage,
      stageSequence: stageSeq,
      resultStatus,
      currentStageLabel: stageLabel || stage,
      heightCm: parseFloat(form.heightCm) || undefined,
      weightKg: parseFloat(form.weightKg) || undefined,
      bmiValue: parseFloat(form.bmiValue) || undefined,
      bmiResult: form.bmiResult,
      colorBlindResult: form.colorBlindResult,
      visibleTattoo: form.visibleTattoo,
      invisibleTattoo: form.invisibleTattoo,
      sweatyPalmResult: form.sweatyPalmResult,
      score: parseFloat(form.score) || undefined,
      passingScore: parseFloat(form.passingScore) || 8,
      maxScore: parseFloat(form.maxScore) || 10,
      remarks: form.remarks,
      evaluatedBy: form.evaluatedBy,
    }, '');

    if (res.success) {
      setMessage({ text: 'Stage result saved successfully!', type: 'success' });
      const updated = await getApplicant(data.applicant.reference_no, '');
      if (updated.data) {
        setData(updated.data);
      }
    } else {
      setMessage({ text: res.error || 'Failed to save.', type: 'error' });
    }
    setSaving(false);
  }

  const { applicant, games, stages, notifications } = data;
  const workflow = getWorkflow(applicant.position_applied, applicant.experience_level);

  return (
    <div style={{ padding: '0' }}>
      <button onClick={() => router.back()} style={{
        padding: '8px 16px', background: '#fff', color: '#1f2937',
        border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px',
        cursor: 'pointer', marginBottom: '20px',
      }}>← Back</button>

      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
        {applicant.first_name} {applicant.last_name}
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
        {applicant.reference_no} &middot; {applicant.position_applied} &middot; {applicant.experience_level || '-'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>Details</h3>
          {[
            ['Email', applicant.email_address],
            ['Contact', applicant.contact_number],
            ['Gender', applicant.gender],
            ['Birthdate', applicant.birthdate],
            ['Height', applicant.height_cm ? `${applicant.height_cm} cm` : '-'],
            ['Weight', applicant.weight_kg ? `${applicant.weight_kg} kg` : '-'],
            ['BMI', applicant.bmi_value || '-'],
            ['Current Stage', applicant.current_stage || '-'],
            ['Status', applicant.application_status || '-'],
            ['Result', applicant.overall_result || '-'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
              <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>{value as string}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {games && games.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>Games</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {games.map((g: any) => (
                  <span key={g.game_code} style={{
                    padding: '4px 12px', background: '#f0f4ff', color: '#163a70',
                    borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  }}>{g.game_code}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>Stage History</h3>
            {stages && stages.length > 0 ? stages.map((s: any) => (
              <div key={s.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{s.stage_name}</span>
                  <span style={{
                    fontSize: '12px', fontWeight: '600',
                    color: s.result_status === 'Passed' ? '#166534' : '#991b1b',
                  }}>{s.result_status}</span>
                </div>
                {s.remarks && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                    {renderFormattedMessage(s.remarks)}
                  </p>
                )}
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>{s.evaluated_at ? new Date(s.evaluated_at).toLocaleString() : ''}</p>
              </div>
            )) : (
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>No stages recorded.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1f2937' }}>Update Stage Result</h3>

        {message && (
          <div style={{
            padding: '14px', borderRadius: '12px', marginBottom: '16px',
            background: message.type === 'success' ? '#ecfdf3' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
            color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px',
          }}>{message.text}</div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Stage *</label>
              <select value={stage} onChange={(e) => handleStageChange(e.target.value)} style={{
                width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px',
              }}>
                <option value="">Select Stage</option>
                {workflow.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Result *</label>
              <select value={resultStatus} onChange={(e) => setResultStatus(e.target.value)} style={{
                width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px',
              }}>
                <option>Passed</option>
                <option>Failed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Next Stage Label</label>
              <input value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} style={{
                width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px',
              }} placeholder={stage || 'Next Stage'} />
            </div>
          </div>

          {stage === 'Initial Screening' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Height (cm)</label>
                <input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Weight (kg)</label>
                <input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>BMI</label>
                <input type="number" step="0.01" value={form.bmiValue} onChange={(e) => setForm({ ...form, bmiValue: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>BMI Result</label>
                <select value={form.bmiResult} onChange={(e) => setForm({ ...form, bmiResult: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }}>
                  <option>Passed</option><option>Failed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Color Blind</label>
                <select value={form.colorBlindResult} onChange={(e) => setForm({ ...form, colorBlindResult: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }}>
                  <option>Passed</option><option>Failed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Visible Tattoo</label>
                <select value={form.visibleTattoo} onChange={(e) => setForm({ ...form, visibleTattoo: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }}>
                  <option>No</option><option>Yes</option>
                </select>
              </div>
            </div>
          )}

          {stage === 'Math Exam' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Score</label>
                <input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Passing Score</label>
                <input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Max Score</label>
                <input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
              </div>
            </div>
          )}

          {stage === 'Final Interview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Sweaty Palm</label>
                <select value={form.sweatyPalmResult} onChange={(e) => setForm({ ...form, sweatyPalmResult: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }}>
                  <option>Passed</option><option>Failed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Final Result</label>
                <select value={resultStatus} onChange={(e) => setResultStatus(e.target.value)} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }}>
                  <option>Passed</option><option>Reprofile</option><option>For Pooling</option><option>Not Recommended</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={3} style={{
              width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', resize: 'vertical',
            }} placeholder="Add remarks..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Evaluated By</label>
              <input value={form.evaluatedBy} onChange={(e) => setForm({ ...form, evaluatedBy: e.target.value })} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', width: '100%', fontSize: '14px' }} />
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            marginTop: '16px', padding: '14px 24px', background: '#8b1e2d', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Stage Result'}
          </button>
        </form>
      </div>

      {notifications && notifications.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#1f2937' }}>Notifications</h3>
          {notifications.map((n: any) => (
            <div key={n.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '13px', color: '#1f2937', margin: 0 }}>
                {renderFormattedMessage(n.notification_message)}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
                {n.stage_name} &middot; {n.result_status} &middot; {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
