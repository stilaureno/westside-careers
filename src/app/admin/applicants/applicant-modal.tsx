'use client';

import { useState, useEffect } from 'react';
import { renderFormattedMessage } from '@/components/formatted-message';
import { getApplicant, updateStage } from '@/lib/actions/admin';
import { getStagesForPosition } from '@/lib/db/positions';
import { createClient } from '@/lib/supabase/client';
import type { Applicant } from '@/types';

interface ApplicantModalProps {
  referenceNo: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}

interface VisibleField {
  id: string;
  field_key: string;
  field_label: string;
  is_visible: boolean;
}

export default function ApplicantModal({ referenceNo, isOpen, onClose, onSaved }: ApplicantModalProps) {
  const [data, setData] = useState<any>(null);
  const [visibleFields, setVisibleFields] = useState<VisibleField[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');
  const [stageSeq, setStageSeq] = useState(1);
  const [resultStatus, setResultStatus] = useState('Passed');
  const [stageLabel, setStageLabel] = useState('');
  const [form, setForm] = useState<any>({ evaluatedBy: '' });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && referenceNo) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, referenceNo]);

  async function loadData() {
    setLoading(true);
    const [applicantRes, fieldsRes] = await Promise.all([
      getApplicant(referenceNo, ''),
      supabase.from('visible_fields').select('*').eq('is_visible', true).order('display_order'),
    ]);
    if (applicantRes.data) {
      setData(applicantRes.data);
    }
    setVisibleFields(fieldsRes.data || []);
    setLoading(false);
  }

  function isFieldVisible(fieldKey: string) {
    return visibleFields.some(f => f.field_key === fieldKey);
  }

  const [workflow, setWorkflow] = useState<string[]>(['Initial Screening']);

  useEffect(() => {
    async function loadWorkflow() {
      const exp = data?.applicant?.experience_level === 'Experienced Dealer' ? 'Experienced' : 'Non-Experienced';
      const stages = await getStagesForPosition(data?.applicant?.position_applied || '', exp);
      setWorkflow(stages);
    }
    if (data?.applicant?.position_applied) {
      loadWorkflow();
    }
  }, [data?.applicant?.position_applied, data?.applicant?.experience_level]);

  function getCompletedStages(stages: any[]): string[] {
    return stages
      .filter((s: any) => s.result_status === 'Passed' || s.result_status === 'Failed' || s.result_status === 'Reprofile' || s.result_status === 'For Pooling' || s.result_status === 'Not Recommended')
      .map((s: any) => s.stage_name);
  }

  function getAvailableStages(workflow: string[], completed: string[]): string[] {
    for (const stage of workflow) {
      if (!completed.includes(stage)) {
        return workflow.slice(workflow.indexOf(stage));
      }
    }
    return [];
  }

  function handleStageChange(stageName: string) {
    setStage(stageName);
    setStageSeq(workflow.indexOf(stageName) + 1);
    updateFormFields(stageName, data?.applicant);
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
      await onSaved?.();
      onClose();
    } else {
      setMessage({ text: res.error || 'Failed to save.', type: 'error' });
    }
    setSaving(false);
  }

  if (!isOpen) return null;

  const { applicant, games, stages, notifications } = data || {};
  const completedStages = stages ? getCompletedStages(stages) : [];

  function computeAvailableStages(wf: string[], completed: string[]): string[] {
    for (const stage of wf) {
      if (!completed.includes(stage)) {
        return wf.slice(wf.indexOf(stage));
      }
    }
    return [];
  }

  const availableStages = computeAvailableStages(workflow, completedStages);

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }} />
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {applicant?.first_name} {applicant?.last_name}
                <span className="ms-2 text-muted fw-normal" style={{ fontSize: '14px' }}>
                  {applicant?.reference_no} · {applicant?.position_applied} · {applicant?.experience_level || '-'}
                </span>
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="card h-100">
                        <div className="card-header bg-white py-2">
                          <h6 className="mb-0">Details</h6>
                        </div>
                        <div className="card-body py-2">
                          {([
                            ['Gender', applicant?.gender, null],
                            ['Height', applicant?.height_cm ? `${applicant?.height_cm} cm` : '-', null],
                            ['Weight', applicant?.weight_kg ? `${applicant?.weight_kg} kg` : '-', null],
                            ['BMI', applicant?.bmi_value || '-', null],
                            ['Current Stage', applicant?.current_stage || '-', null],
                            ['Status', applicant?.application_status || '-', null],
                            ['Result', applicant?.overall_result || '-', null],
                            ['Email', applicant?.email_address, 'email_address'],
                            ['Contact', applicant?.contact_number, 'contact_number'],
                            ['Birthdate', applicant?.birthdate, 'birthdate'],
                            ['Age', applicant?.age ? `${applicant?.age}` : '-', 'age'],
                          ] as [string, string, string | null][]).map(([label, value, fieldKey]) => {
                            if (fieldKey && !isFieldVisible(fieldKey)) return null;
                            return (
                              <div key={label} className="d-flex justify-content-between py-1 border-bottom">
                                <span className="text-muted small">{label}</span>
                                <span className="fw-medium">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex flex-column gap-3">
                        {games && games.length > 0 && (
                          <div className="card">
                            <div className="card-header bg-white py-2">
                              <h6 className="mb-0">Games</h6>
                            </div>
                            <div className="card-body py-2">
                              <div className="d-flex flex-wrap gap-2">
                                {games.map((g: any) => (
                                  <span key={g.game_code} className="badge bg-info">{g.game_code}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="card">
                          <div className="card-header bg-white py-2">
                            <h6 className="mb-0">Stage History</h6>
                          </div>
                          <div className="card-body py-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {stages && stages.length > 0 ? stages.map((s: any) => (
                              <div key={s.id} className="border-bottom py-2">
                                <div className="d-flex justify-content-between">
                                  <span className="fw-medium">{s.stage_name}</span>
                                  <span className={s.result_status === 'Passed' ? 'text-success' : 'text-danger'}>{s.result_status}</span>
                                </div>
                                {s.remarks && <p className="text-muted small mb-0">{renderFormattedMessage(s.remarks)}</p>}
                                <p className="text-muted small mb-0">{s.evaluated_at ? new Date(s.evaluated_at).toLocaleString() : ''}</p>
                              </div>
                            )) : (
                              <p className="text-muted mb-0">No stages recorded.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header bg-white">
                      <h6 className="mb-0">Update Stage Result</h6>
                    </div>
                    <div className="card-body">
                      {message && (
                        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} py-2`}>
                          {message.text}
                        </div>
                      )}
                      <form onSubmit={handleSave}>
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label small">Stage *</label>
                            <select className="form-select form-select-sm" value={stage} onChange={(e) => handleStageChange(e.target.value)}>
                              <option value="">Select Stage</option>
                              {availableStages.length === 0 && <option disabled>No stages available</option>}
                              {availableStages.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small">Result *</label>
                            <select className="form-select form-select-sm" value={resultStatus} onChange={(e) => setResultStatus(e.target.value)}>
                              <option>Passed</option>
                              <option>Failed</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small">Next Stage Label</label>
                            <input className="form-control form-control-sm" value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} placeholder={stage || 'Next Stage'} />
                          </div>
                        </div>

                        {stage === 'Initial Screening' && (
                          <div className="row g-3 mb-3">
                            <div className="col-md-2">
                              <label className="form-label small">Height (cm)</label>
                              <input type="number" className="form-control form-control-sm" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label small">Weight (kg)</label>
                              <input type="number" className="form-control form-control-sm" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label small">BMI</label>
                              <input type="number" step="0.01" className="form-control form-control-sm" value={form.bmiValue} onChange={(e) => setForm({ ...form, bmiValue: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label small">BMI Result</label>
                              <select className="form-select form-select-sm" value={form.bmiResult} onChange={(e) => setForm({ ...form, bmiResult: e.target.value })}>
                                <option>Passed</option><option>Failed</option>
                              </select>
                            </div>
                            <div className="col-md-2">
                              <label className="form-label small">Color Blind</label>
                              <select className="form-select form-select-sm" value={form.colorBlindResult} onChange={(e) => setForm({ ...form, colorBlindResult: e.target.value })}>
                                <option>Passed</option><option>Failed</option>
                              </select>
                            </div>
                            <div className="col-md-2">
                              <label className="form-label small">Visible Tattoo</label>
                              <select className="form-select form-select-sm" value={form.visibleTattoo} onChange={(e) => setForm({ ...form, visibleTattoo: e.target.value })}>
                                <option>No</option><option>Yes</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {stage === 'Math Exam' && (
                          <div className="row g-3 mb-3">
                            <div className="col-md-4">
                              <label className="form-label small">Score</label>
                              <input type="number" className="form-control form-control-sm" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label small">Passing Score</label>
                              <input type="number" className="form-control form-control-sm" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: e.target.value })} />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label small">Max Score</label>
                              <input type="number" className="form-control form-control-sm" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
                            </div>
                          </div>
                        )}

                        {stage === 'Final Interview' && (
                          <div className="row g-3 mb-3">
                            {data?.applicant?.position_applied === 'Dealer' && (
                              <div className="col-md-6">
                                <label className="form-label small">Sweaty Palm</label>
                                <select className="form-select form-select-sm" value={form.sweatyPalmResult} onChange={(e) => setForm({ ...form, sweatyPalmResult: e.target.value })}>
                                  <option>Passed</option><option>Failed</option>
                                </select>
                              </div>
                            )}
                            <div className={`col-md-${data?.applicant?.position_applied === 'Dealer' ? 6 : 12}`}>
                              <label className="form-label small">Final Result</label>
                              <select className="form-select form-select-sm" value={resultStatus} onChange={(e) => setResultStatus(e.target.value)}>
                                <option>Passed</option><option>Reprofile</option><option>For Pooling</option><option>Not Recommended</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="form-label small">Remarks</label>
                          <textarea className="form-control form-control-sm" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Add remarks..." />
                        </div>

                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label small">Evaluated By</label>
                            <input className="form-control form-control-sm" value={form.evaluatedBy} onChange={(e) => setForm({ ...form, evaluatedBy: e.target.value })} />
                          </div>
                        </div>

                        <button type="submit" disabled={saving} className="btn btn-danger">
                          {saving ? 'Saving...' : 'Save Stage Result'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {notifications && notifications.length > 0 && (
                    <div className="card mt-3">
                      <div className="card-header bg-white py-2">
                        <h6 className="mb-0">Notifications</h6>
                      </div>
                      <div className="card-body py-2">
                        {notifications.map((n: any) => (
                          <div key={n.id} className="border-bottom py-2">
                            <p className="mb-0">{renderFormattedMessage(n.notification_message)}</p>
                            <p className="text-muted small mb-0">{n.stage_name} · {n.result_status} · {n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
