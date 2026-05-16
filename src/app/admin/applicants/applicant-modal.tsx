'use client';

import { useState, useEffect } from 'react';
import { renderFormattedMessage } from '@/components/formatted-message';
import { getApplicant, updateStage, allowExam } from '@/lib/actions/admin';
import { getStagesForPosition } from '@/lib/db/positions';
import { createClient } from '@/lib/supabase/client';
import { updateApplicantBasicInfo } from '@/lib/actions/applicant';
import type { Applicant } from '@/types';
import styles from './applicant-modal.module.css';

interface ApplicantModalProps {
  referenceNo: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
  isSuperAdmin?: boolean;
  modalSectionVisibility?: string[] | null;
}

interface VisibleField {
  id: string;
  field_key: string;
  field_label: string;
  is_visible: boolean;
}

export default function ApplicantModal({ referenceNo, isOpen, onClose, onSaved, isSuperAdmin = false, modalSectionVisibility }: ApplicantModalProps) {
  const [data, setData] = useState<any>(null);
  const [visibleFields, setVisibleFields] = useState<VisibleField[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [stage, setStage] = useState('');
  const [stageSeq, setStageSeq] = useState(1);
  const [resultStatus, setResultStatus] = useState('');
  const [stageLabel, setStageLabel] = useState('');
  const [stageVersions, setStageVersions] = useState<Record<string, number>>({});
  const [stageVersionHistory, setStageVersionHistory] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState<any>({
    heightCm: '',
    weightKg: '',
    bmiValue: '',
    bmiResult: '',
    colorBlindResult: '',
    visibleTattoo: 'No',
    invisibleTattoo: 'No',
    sweatyPalmResult: '',
    score: '',
    passingScore: 8,
    maxScore: 10,
    remarks: '',
    evaluatedBy: '',
    editReason: '',
    applicantNumber: '',
  });
  const [reprofileDepartment, setReprofileDepartment] = useState('');
  const [reprofilePosition, setReprofilePosition] = useState('');
  const [positionsList, setPositionsList] = useState<{ id: string; name: string; department_id: string }[]>([]);
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    birthdate: '',
    applicant_number: '',
  });
  const [savingBasic, setSavingBasic] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const finalResultOptions = [
    { value: 'Passed', label: 'Passed', icon: '✓' },
    { value: 'Reprofile', label: 'Reprofile', icon: '↻' },
    { value: 'For Pooling', label: 'For Pooling', icon: '☰' },
    { value: 'Not Recommended', label: 'Not Recommended', icon: '✕' },
  ];

  function getStatusClass(status: string | undefined) {
    if (!status) return styles.statusPending;
    const s = status.toLowerCase();
    if (s === 'passed') return styles.statusPassed;
    if (s === 'failed') return styles.statusFailed;
    if (s === 'pending') return styles.statusPending;
    if (s === 'ongoing') return styles.statusOngoing;
    if (s === 'reprofile') return styles.statusReprofile;
    if (s === 'for pooling') return styles.statusForPooling;
    if (s === 'not recommended') return styles.statusNotRecommended;
    if (s === 'completed') return styles.statusCompleted;
    return styles.statusPending;
  }

  const supabase = createClient();

  function resetModalState() {
    setData(null);
    setVisibleFields([]);
    setMessage(null);
    setSaving(false);
    setAuthorizing(false);
    setStage('');
    setStageSeq(1);
    setResultStatus('');
    setStageLabel('');
    setStageVersions({});
    setStageVersionHistory({});
    setForm({
      heightCm: '',
      weightKg: '',
      bmiValue: '',
      bmiResult: '',
      colorBlindResult: '',
      visibleTattoo: 'No',
      invisibleTattoo: 'No',
      sweatyPalmResult: '',
      score: '',
      passingScore: 8,
      maxScore: 10,
      remarks: '',
      evaluatedBy: '',
      editReason: '',
      applicantNumber: '',
    });
    setReprofileDepartment('');
    setReprofilePosition('');
  }

  useEffect(() => {
    if (isOpen && referenceNo) {
      resetModalState();
      loadData();
    } else if (!isOpen) {
      resetModalState();
      setLoading(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, referenceNo]);

  async function loadData() {
    setLoading(true);
    const [applicantRes, fieldsRes, positionsRes, departmentsRes] = await Promise.all([
      getApplicant(referenceNo, ''),
      supabase.from('visible_fields').select('*').eq('is_visible', true).order('display_order'),
      supabase.from('positions').select('*').eq('is_active', true).order('name'),
      supabase.from('departments').select('*').eq('is_active', true).order('name'),
    ]);
    if (applicantRes.data) {
      setData(applicantRes.data);
    }
    setVisibleFields(fieldsRes.data || []);
    setPositionsList(positionsRes.data || []);
    setDepartmentsList(departmentsRes.data || []);
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

  useEffect(() => {
    async function loadVersionCounts() {
      if (!data?.stages || data.stages.length === 0) return;
      const supabase = createClient();
      const stageIds = data.stages.map((s: any) => s.id).filter(Boolean);
      if (stageIds.length === 0) return;
      
      const { data: versions } = await supabase
        .from('stage_result_versions')
        .select('stage_result_id, version_number, result_status, remarks, evaluated_by, evaluated_at, edit_reason')
        .in('stage_result_id', stageIds);
      
      if (versions) {
        const counts: Record<string, number> = {};
        const history: Record<string, any[]> = {};
        versions.forEach((v: any) => {
          const current = counts[v.stage_result_id] || 0;
          if (v.version_number > current) {
            counts[v.stage_result_id] = v.version_number;
          }
          if (!history[v.stage_result_id]) history[v.stage_result_id] = [];
          history[v.stage_result_id].push(v);
        });
        Object.keys(history).forEach((stageResultId) => {
          history[stageResultId].sort((a, b) => b.version_number - a.version_number);
        });
        setStageVersions(counts);
        setStageVersionHistory(history);
      }
    }
    loadVersionCounts();
  }, [data?.stages]);

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
    loadStageResults(stageName, data?.applicant);
  }

  async function loadStageResults(stageName: string, app: Applicant) {
    const { data: stageResult } = await supabase
      .from('stage_results')
      .select('*')
      .eq('reference_no', referenceNo)
      .eq('stage_name', stageName)
      .single();

    if (stageResult) {
      const legacySweatyPalm =
        stageName === 'Initial Screening'
          ? data?.stages?.find((s: any) => s.stage_name === 'Final Interview')?.sweaty_palm_result || ''
          : '';
      setForm({
        heightCm: stageResult.height_cm || app?.height_cm || '',
        weightKg: stageResult.weight_kg || app?.weight_kg || '',
        bmiValue: stageResult.bmi_value || app?.bmi_value || '',
        bmiResult: stageResult.bmi_result || '',
        colorBlindResult: stageResult.color_blind_result || '',
        visibleTattoo: stageResult.visible_tattoo || 'No',
        invisibleTattoo: stageResult.invisible_tattoo || 'No',
        sweatyPalmResult: stageResult.sweaty_palm_result || legacySweatyPalm,
        score: stageResult.score?.toString() || '',
        passingScore: stageResult.passing_score || 8,
        maxScore: stageResult.max_score || 10,
        // Reset remarks when editing Math Exam to prompt fresh comments
        remarks: stageName === 'Math Exam' ? '' : (stageResult.remarks || ''),
        evaluatedBy: stageResult.evaluated_by || '',
        editReason: '',
        applicantNumber: app?.applicant_number?.toString() || '',
      });
      setReprofileDepartment(stageResult.reprofile_department || '');
      setReprofilePosition(stageResult.reprofile_position || '');
      if (stageName === 'Final Interview') {
        setResultStatus(stageResult.result_status || '');
      }
    } else {
      setForm({
        heightCm: app?.height_cm || '',
        weightKg: app?.weight_kg || '',
        bmiValue: app?.bmi_value || '',
        bmiResult: '',
        colorBlindResult: '',
        visibleTattoo: 'No',
        invisibleTattoo: 'No',
        sweatyPalmResult: '',
        score: '',
        passingScore: 8,
        maxScore: 10,
        remarks: '',
        evaluatedBy: '',
        editReason: '',
        applicantNumber: app?.applicant_number?.toString() || '',
      });
      setReprofileDepartment('');
      setReprofilePosition('');
      if (stageName === 'Final Interview') {
        setResultStatus('');
      }
    }
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
      sweatyPalmResult: '',
      score: '',
      passingScore: 8,
      maxScore: 10,
      remarks: '',
      evaluatedBy: 'HR',
      editReason: '',
      applicantNumber: app?.applicant_number?.toString() || '',
    });
  }

  async function handleAllowExam() {
    setAuthorizing(true);
    setMessage(null);
    const res = await allowExam(data.applicant.reference_no, '');
    if (res.success) {
      setMessage({ text: 'Exam authorized successfully!', type: 'success' });
      await onSaved?.();
      await loadData();
    } else {
      setMessage({ text: res.error || 'Failed to authorize exam.', type: 'error' });
    }
    setAuthorizing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!stage) {
      setMessage({ text: 'Please select a stage.', type: 'error' });
      return;
    }
    if (!form.evaluatedBy?.trim()) {
      setMessage({ text: 'Please enter evaluator name.', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage(null);

    const isDealer = data?.applicant?.position_applied === 'Dealer';

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
      ...(isDealer && stage === 'Initial Screening' && { sweatyPalmResult: form.sweatyPalmResult }),
      ...(resultStatus === 'Reprofile' && { 
        reprofileDepartment, 
        reprofilePosition,
        reprofileExperienceLevel: reprofilePosition === 'Dealer' ? (form.reprofileExperienceLevel || null) : null,
        originalPosition: data?.applicant?.position_applied,
        originalDepartment: data?.applicant?.department,
        originalExperienceLevel: data?.applicant?.experience_level,
      }),
      score: parseFloat(form.score) || undefined,
      passingScore: parseFloat(form.passingScore) || 8,
      maxScore: parseFloat(form.maxScore) || 10,
      remarks: form.remarks,
      evaluatedBy: form.evaluatedBy,
      evaluatedAt: new Date().toISOString(),
      editReason: form.editReason,
    }, '');

    if (res.success) {
      // If this is Initial Screening and applicant_number is provided, save it to applicants table
      if (stage === 'Initial Screening' && form.applicantNumber) {
        const applicantNum = parseInt(form.applicantNumber, 10);
        if (!isNaN(applicantNum) && applicantNum > 0) {
          // Check for duplicates (exclude current applicant)
          const { data: existing } = await supabase
            .from('applicants')
            .select('applicant_id, reference_no')
            .eq('applicant_number', applicantNum)
            .neq('reference_no', data.applicant.reference_no)
            .single();
          
          if (existing) {
            setMessage({ text: `Error: Applicant number ${applicantNum} is already used by another applicant (${existing.reference_no}).`, type: 'error' });
            setSaving(false);
            return;
          }
          
          // Save the applicant_number
          await supabase
            .from('applicants')
            .update({ applicant_number: applicantNum })
            .eq('reference_no', data.applicant.reference_no);
        }
      }
      
      await onSaved?.();
      onClose();
    } else {
      setMessage({ text: res.error || 'Failed to save.', type: 'error' });
    }
    setSaving(false);
  }

  function startEditBasic() {
    setBasicInfoForm({
      first_name: applicant?.first_name || '',
      last_name: applicant?.last_name || '',
      middle_name: applicant?.middle_name || '',
      birthdate: applicant?.birthdate || '',
      applicant_number: applicant?.applicant_number?.toString() || '',
    });
    setIsEditingBasic(true);
  }

  async function saveBasicInfo() {
    setSavingBasic(true);
    
    // Check for duplicate applicant_number if provided
    if (basicInfoForm.applicant_number) {
      const applicantNum = parseInt(basicInfoForm.applicant_number, 10);
      if (!isNaN(applicantNum) && applicantNum > 0) {
        const { data: existing } = await supabase
          .from('applicants')
          .select('applicant_id, reference_no')
          .eq('applicant_number', applicantNum)
          .neq('reference_no', applicant?.reference_no)
          .single();
        
        if (existing) {
          setSavingBasic(false);
          setMessage({ text: `Error: Applicant number ${applicantNum} is already used by ${existing.reference_no}`, type: 'error' });
          return;
        }
        
        // Update applicant_number first
        await supabase
          .from('applicants')
          .update({ applicant_number: applicantNum })
          .eq('reference_no', applicant?.reference_no);
      }
    } else {
      // If cleared, set to null
      await supabase
        .from('applicants')
        .update({ applicant_number: null })
        .eq('reference_no', applicant?.reference_no);
    }
    
    const result = await updateApplicantBasicInfo(applicant?.reference_no || '', {
      first_name: basicInfoForm.first_name,
      last_name: basicInfoForm.last_name,
      middle_name: basicInfoForm.middle_name || undefined,
      birthdate: basicInfoForm.birthdate,
    });
    setSavingBasic(false);
    if (result.success) {
      setIsEditingBasic(false);
      await loadData();
      await onSaved?.();
    } else {
      setMessage({ text: `Failed to save: ${result.error}`, type: 'error' });
    }
  }

  function cancelEditBasic() {
    setIsEditingBasic(false);
  }

  if (!isOpen) return null;

  const { applicant, games, stages, notifications } = data || {};
  const completedStages = stages ? getCompletedStages(stages) : [];

  function computeAvailableStages(wf: string[], completed: string[]): string[] {
    for (const stage of wf) {
      if (!completed.includes(stage)) {
        return [stage];
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
              {isEditingBasic ? (
                <div className="w-100">
                  <div className="row g-2 mb-2">
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Last Name"
                        value={basicInfoForm.last_name}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="First Name"
                        value={basicInfoForm.first_name}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Middle Name"
                        value={basicInfoForm.middle_name}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, middle_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={basicInfoForm.birthdate}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, birthdate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Applicant Number (optional)"
                        value={basicInfoForm.applicant_number}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, applicant_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={saveBasicInfo}
                      disabled={savingBasic}
                    >
                      {savingBasic ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={cancelEditBasic}
                      disabled={savingBasic}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <h5 className="modal-title d-flex align-items-center">
                  {applicant?.applicant_number && (
                    <span 
                      className="me-3 px-2 py-1 fw-bold" 
                      style={{ 
                        fontSize: '16px', 
                        color: '#0d6efd', 
                        border: '2px solid #000', 
                        borderRadius: '6px' 
                      }}
                    >
                      #{applicant.applicant_number}
                    </span>
                  )}
                  <span>
                    {applicant?.last_name?.toUpperCase()}, {applicant?.first_name}{applicant?.middle_name ? ' ' + applicant?.middle_name : ''}
                    <span 
                      className="ms-2 text-muted fw-normal" 
                      style={{ fontSize: '14px', cursor: 'pointer' }}
                      onClick={async () => {
                        try {
                          const refNo = applicant?.reference_no || '';
                          if (refNo) {
                            await navigator.clipboard.writeText(refNo);
                            setCopyFeedback('Copied!');
                            setTimeout(() => setCopyFeedback(null), 2000);
                          }
                        } catch (err) {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = applicant?.reference_no || '';
                          textArea.style.position = 'fixed';
                          textArea.style.left = '-9999px';
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          setCopyFeedback('Copied!');
                          setTimeout(() => setCopyFeedback(null), 2000);
                        }
                      }}
                      title="Click to copy reference number"
                    >
                      {applicant?.reference_no} {copyFeedback && <span className="text-success ms-1">{copyFeedback}</span>}
                    </span>
                    <span className="ms-1">· {applicant?.position_applied} · {applicant?.experience_level || '-'}</span>
                  </span>
                </h5>
              )}
              {!isEditingBasic && (
                <>
                  <button type="button" className="btn-close me-2" onClick={onClose} />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={startEditBasic}
                    title="Edit Name & Birthdate"
                  >
                    ✎
                  </button>
                </>
              )}
              {isEditingBasic && (
                <button type="button" className="btn-close" onClick={cancelEditBasic} disabled={savingBasic} />
              )}
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
                            ['Status', applicant?.application_status || '-', 'application_status'],
                            ['Result', applicant?.overall_result || '-', 'overall_result'],
                            ['Email', applicant?.email_address, 'email_address'],
                            ['Contact', applicant?.contact_number, 'contact_number'],
                            ['Birthdate', applicant?.birthdate, 'birthdate'],
                            ['Age', applicant?.age ? `${applicant?.age}` : '-', 'age'],
                          ] as [string, string, string | null][]).map(([label, value, fieldKey]) => {
                            if (fieldKey && !isFieldVisible(fieldKey)) return null;
                            const isStatus = label === 'Status' || label === 'Result';
                            return (
                              <div key={label} className="d-flex justify-content-between py-1 border-bottom">
                                <span className="text-muted small">{label}</span>
                                <span className={isStatus ? getStatusClass(value) : 'fw-medium'}>{value}</span>
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
                          <div className="card-body py-2">
                            {stages && stages.length > 0 ? stages.map((s: any) => (
                              <div key={s.id} className="border-bottom py-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div className="d-flex align-items-center">
                                    <span className="fw-bold">{s.stage_name}</span>
                                    {stageVersions[s.id] > 1 && (
                                      <span className="badge bg-secondary ms-2" style={{ fontSize: '10px' }}>v{stageVersions[s.id]}</span>
                                    )}
                                  </div>
                                  <div className="d-flex align-items-center">
                                    <span className={s.result_status === 'Passed' ? 'text-success' : s.result_status === 'Reprofile' ? 'text-warning' : 'text-danger'} style={{ marginRight: '8px' }}>{s.result_status}</span>
                                    <button 
                                      type="button" 
                                      className="btn btn-sm btn-outline-secondary p-0 px-1" 
                                      style={{ lineHeight: 1 }}
                                      onClick={() => { setStage(s.stage_name); setStageSeq(s.stage_sequence); loadStageResults(s.stage_name, data?.applicant); setResultStatus(s.result_status || ''); }}
                                      title="Edit this stage"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                </div>
                                {s.result_status === 'Reprofile' && (
                                  <p className="small mb-0" style={{ background: '#fef3c7', color: '#92400e', padding: '6px 10px', borderRadius: '6px', fontWeight: '500', marginTop: '6px' }}>
                                    🔄 <strong>Original:</strong> {s.original_position || data?.applicant?.position_applied || 'N/A'} → <strong>Reprofiled to:</strong> <span style={{ color: '#b45309', fontWeight: '700' }}>{s.reprofile_position || 'N/A'}</span>
                                  </p>
                                )}
                                {s.stage_name === 'Math Exam' && s.termination_reason === 'WINDOWS_LOST_FOCUS' && (
                                  <p className="text-danger small mb-0 fw-bold">Auto submitted due to lost window focus</p>
                                )}
                                {s.remarks && <p className="text-muted small mb-0">{renderFormattedMessage(s.remarks)}</p>}
                                <p className="text-muted small mb-0">
                                  {s.evaluated_at ? new Date(s.evaluated_at).toLocaleString() : ''}
                                  {s.evaluated_by && <> · Evaluated by: <span className="text-primary">{s.evaluated_by}</span></>}
                                </p>
                                {((stageVersionHistory[s.id] || []).filter((v: any) => v.version_number < (stageVersions[s.id] || 1)).length > 0) && (
                                  <div className="mt-2">
                                    <p className="small mb-1 fw-semibold" style={{ color: '#6b7280' }}>Previous Entries</p>
                                    {(stageVersionHistory[s.id] || [])
                                      .filter((v: any) => v.version_number < (stageVersions[s.id] || 1))
                                      .map((v: any) => (
                                        <div key={`${s.id}-v${v.version_number}`} className="small py-1 ps-2 border-start" style={{ color: '#6b7280' }}>
                                          <span className="fw-semibold">v{v.version_number}</span> · {v.result_status}
                                          {v.edit_reason && <> · {v.edit_reason}</>}
                                          {v.evaluated_at && <> · {new Date(v.evaluated_at).toLocaleString()}</>}
                                          {v.evaluated_by && <> · by {v.evaluated_by}</>}
                                          {v.remarks && <div>{renderFormattedMessage(v.remarks)}</div>}
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )) : (
                              <p className="text-muted mb-0">No stages recorded.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(isSuperAdmin || !completedStages.includes('Final Interview')) && (
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
                            {stage !== 'Final Interview' && (
                              <>
                                <label className="form-label small">Result *</label>
                                <select className="form-select form-select-sm" value={resultStatus} onChange={(e) => setResultStatus(e.target.value)} required>
                                  <option value="">Select...</option>
                                  <option>Passed</option>
                                  <option>Failed</option>
                                  <option>Reprofile</option>
                                </select>
                              </>
                            )}
                          </div>
                          
                        </div>

                        {stage === 'Initial Screening' && (
                          <div className="row g-3 mb-3">
                            <div className="col-md-2">
                              <label htmlFor="applicantNumber" className="form-label small">Applicant ID</label>
                              <input 
                                id="applicantNumber" 
                                type="number" 
                                className="form-control form-control-sm" 
                                value={form.applicantNumber} 
                                onChange={(e) => setForm({ ...form, applicantNumber: e.target.value })}
                                placeholder="Enter ID from security"
                              />
                              {form.applicantNumber && (
                                <small className="text-muted">
                                  {data?.applicant?.applicant_number ? 'Current: ' + data.applicant.applicant_number : 'Will be saved'}
                                </small>
                              )}
                            </div>
                            <div className="col-md-2">
                              <label htmlFor="heightCm" className="form-label small">Height (cm)</label>
                              <input id="heightCm" type="number" className="form-control form-control-sm" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label htmlFor="weightKg" className="form-label small">Weight (kg)</label>
                              <input id="weightKg" type="number" className="form-control form-control-sm" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label htmlFor="bmiValue" className="form-label small">BMI</label>
                              <input id="bmiValue" type="number" step="0.01" className="form-control form-control-sm" value={form.bmiValue} onChange={(e) => setForm({ ...form, bmiValue: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label htmlFor="bmiResult" className="form-label small">BMI Result</label>
                              <select id="bmiResult" className="form-select form-select-sm" value={form.bmiResult} onChange={(e) => setForm({ ...form, bmiResult: e.target.value })} required>
                                <option value="">Select...</option>
                                <option>Passed</option><option>Failed</option>
                              </select>
                            </div>
                            <div className="col-md-2">
                              <label htmlFor="colorBlindResult" className="form-label small">Color Blind</label>
                              <select id="colorBlindResult" className="form-select form-select-sm" value={form.colorBlindResult} onChange={(e) => setForm({ ...form, colorBlindResult: e.target.value })} required>
                                <option value="">Select...</option>
                                <option>Passed</option><option>Failed</option>
                              </select>
                            </div>
                            <div className="col-md-2">
                              <label htmlFor="visibleTattoo" className="form-label small">Visible Tattoo</label>
                              <select id="visibleTattoo" className="form-select form-select-sm" value={form.visibleTattoo} onChange={(e) => setForm({ ...form, visibleTattoo: e.target.value })}>
                                <option>No</option><option>Yes</option>
                              </select>
                            </div>
                            {data?.applicant?.position_applied === 'Dealer' && (
                              <div className="col-md-2">
                                <label className="form-label small">Sweaty Palm</label>
                                <select className="form-select form-select-sm" value={form.sweatyPalmResult} onChange={(e) => setForm({ ...form, sweatyPalmResult: e.target.value })} required>
                                  <option value="">Select...</option>
                                  <option>Passed</option><option>Failed</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        {(stage === 'Math Exam' || stage === 'Pen & Paper Test') && (
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

                        {/* Quick access to Pen & Paper stage if present */}
                        {stage === 'Math Exam' && (
                          <div className="mb-3 d-flex gap-2">
                            {data?.stages?.some((s: any) => s.stage_name === 'Pen & Paper Test') ? (
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => handleStageChange('Pen & Paper Test')}>Open Pen & Paper Test</button>
                            ) : (
                              <button type="button" className="btn btn-outline-warning btn-sm" onClick={async () => {
                                // Schedule Pen & Paper stage
                                if (!confirm('Schedule Pen & Paper test for this applicant?')) return;
                                const payload = {
                                  referenceNo: data.applicant.reference_no,
                                  stageName: 'Pen & Paper Test',
                                  stageSequence: 99,
                                  resultStatus: '',
                                  currentStageLabel: 'Pen & Paper Test',
                                  score: undefined,
                                  passingScore: 30,
                                  maxScore: 50,
                                  remarks: 'Scheduled Pen & Paper retake',
                                  evaluatedBy: form.evaluatedBy || 'HR',
                                  evaluatedAt: new Date().toISOString(),
                                  editReason: 'Scheduled Pen & Paper via admin UI',
                                };
                                try {
                                  setSaving(true);
                                  const res = await updateStage(payload, '');
                                  if (res.success) {
                                    setMessage({ text: 'Pen & Paper test scheduled. You can now open it from the stages list.', type: 'success' });
                                    await loadData();
                                    setStage('Pen & Paper Test');
                                    setStageSeq(99);
                                    await loadStageResults('Pen & Paper Test', data.applicant);
                                  } else {
                                    setMessage({ text: res.error || 'Failed to schedule Pen & Paper test.', type: 'error' });
                                  }
                                } finally {
                                  setSaving(false);
                                }
                              }}>Schedule Pen & Paper Test</button>
                            )}
                          </div>
                        )}

                        {stage === 'Math Exam' && data?.applicant?.exam_authorized !== 'Yes' && (
                          <div className="mb-3">
                            <button
                              type="button"
                              className="btn btn-warning"
                              onClick={handleAllowExam}
                              disabled={authorizing}
                            >
                              {authorizing ? 'Authorizing...' : 'Allow Exam'}
                            </button>
                          </div>
                        )}

                        {stage === 'Final Interview' && (
                          <div className="row g-3 mb-3">
                            <div className="col-md-12">
                              <label className="form-label small fw-bold text-dark">FINAL RESULT</label>
                              <div className={styles.finalResultContainer}>
                                {finalResultOptions.map((option) => (
                                  <label
                                    key={option.value}
                                    className={`${styles.radioCard} ${styles[option.value === 'Passed' ? 'passed' : option.value === 'Reprofile' ? 'reprofile' : option.value === 'For Pooling' ? 'pooling' : 'notRecommended']} ${resultStatus === option.value ? styles.selected : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name="finalResult"
                                      value={option.value}
                                      checked={resultStatus === option.value}
                                      onChange={(e) => setResultStatus(e.target.value)}
                                    />
                                    <span className={styles.icon}>{option.icon}</span>
                                    <span className={styles.label}>{option.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {resultStatus === 'Reprofile' && (
                          <div className="row g-3 mb-3">
                            <div className="col-md-4">
                              <label className="form-label small">Reprofile Department</label>
                              <select className="form-select form-select-sm" value={reprofileDepartment} onChange={(e) => { setReprofileDepartment(e.target.value); setReprofilePosition(''); }}>
                                <option value="">Select Department...</option>
                                {departmentsList.map((dept) => (
                                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label small">Reprofile Position</label>
                              <select className="form-select form-select-sm" value={reprofilePosition} onChange={(e) => { setReprofilePosition(e.target.value); if (e.target.value !== 'Dealer') { setForm({ ...form, reprofileExperienceLevel: '' }); } }} disabled={!reprofileDepartment}>
                                <option value="">Select Position...</option>
                                {positionsList
                                  .filter((pos) => {
                                    const dept = departmentsList.find((d) => d.name === reprofileDepartment);
                                    return dept && pos.department_id === dept.id;
                                  })
                                  .map((pos) => (
                                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                                  ))}
                              </select>
                            </div>
                            {reprofilePosition === 'Dealer' && (
                              <div className="col-md-4">
                                <label className="form-label small">Experience Level <span className="text-danger">*</span></label>
                                <select
                                  className="form-select form-select-sm"
                                  value={form.reprofileExperienceLevel !== undefined ? form.reprofileExperienceLevel : data?.applicant?.experience_level || ''}
                                  onChange={(e) => setForm({ ...form, reprofileExperienceLevel: e.target.value })}
                                  required
                                >
                                  <option value="">Select Experience...</option>
                                  <option>Non-Experienced Dealer</option>
                                  <option>Experienced Dealer</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="form-label small">Remarks</label>
                          <textarea className="form-control form-control-sm" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Add remarks..." />
                        </div>

                        <div className="mb-3">
                          <label className="form-label small" style={{ color: '#6b7280' }}>Edit Reason <span style={{ fontWeight: 'normal', color: '#9ca3af' }}>(optional, for history tracking)</span></label>
                          <input className="form-control form-control-sm" value={form.editReason ?? ''} onChange={(e) => setForm({ ...form, editReason: e.target.value })} placeholder="e.g., Retake after failed exam, Updated score..." />
                        </div>

                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label small">Evaluated By <span className="text-danger">*</span></label>
                            <input className="form-control form-control-sm" value={form.evaluatedBy} onChange={(e) => setForm({ ...form, evaluatedBy: e.target.value })} required />
                          </div>
                        </div>

                        <button type="submit" disabled={saving} className="btn btn-danger">
                          {saving ? 'Saving...' : 'Save Stage Result'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                  {notifications && notifications.length > 0 && (isSuperAdmin || (modalSectionVisibility || []).includes('notifications')) && (
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
