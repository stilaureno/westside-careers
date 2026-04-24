'use server';

import { createClient } from '@/lib/supabase/server';
import { computeBMI, buildDuplicateKey, generateReferenceNo, generateApplicantId, getStageWorkflow, getNextStage } from '@/lib/db/applicants';
import type { ApplicationFormData, Applicant, StageRoadmapItem } from '@/types';

export async function submitApplication(formData: ApplicationFormData): Promise<{ success: boolean; referenceNo?: string; error?: string }> {
  const supabase = await createClient();

  const age = Math.floor((Date.now() - new Date(formData.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const bmi = formData.heightCm && formData.weightKg ? computeBMI(formData.heightCm, formData.weightKg) : null;
  const duplicateKey = buildDuplicateKey(formData.lastName, formData.firstName, formData.middleName || '', formData.birthdate, formData.contactNumber);
  const referenceNo = generateReferenceNo();
  const applicantId = generateApplicantId();
  const workflow = getStageWorkflow(formData.positionApplied, formData.experienceLevel);

  const { error } = await supabase
    .from('applicants')
    .insert({
      applicant_id: applicantId,
      reference_no: referenceNo,
      last_name: formData.lastName,
      first_name: formData.firstName,
      middle_name: formData.middleName || null,
      birthdate: formData.birthdate,
      age,
      gender: formData.gender,
      contact_number: formData.contactNumber,
      email_address: formData.emailAddress || null,
      height_cm: formData.heightCm || null,
      weight_kg: formData.weightKg || null,
      bmi_value: bmi || null,
      position_applied: formData.positionApplied,
      experience_level: formData.experienceLevel || null,
      current_company_name: formData.currentCompanyName || null,
      current_position: formData.currentPosition || null,
      previous_company_name: formData.previousCompanyName || null,
      preferred_department: formData.preferredDepartment || null,
      currently_employed: formData.currentlyEmployed,
      duplicate_key: duplicateKey,
      current_stage: 'Initial Screening',
      application_status: 'Pending',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  if (formData.experienceLevel === 'Experienced Dealer' && formData.games && formData.games.length > 0) {
    const games = formData.games.slice(0, 4);
    await supabase.from('applicant_games').insert(
      games.map((game) => ({
        applicant_id: applicantId,
        reference_no: referenceNo,
        game_code: game,
      }))
    );
  }

  const applicant_id = applicantId;
  await supabase.from('applicant_notifications').insert({
    applicant_id,
    reference_no: referenceNo,
    stage_name: 'Initial Screening',
    result_status: 'Pending',
    notification_message: 'Your application has been received. Please wait for further instructions.',
    visible_to_applicant: 'Yes',
    created_by: 'System',
  });

  return { success: true, referenceNo };
}

export async function getApplicantStatus(
  referenceNo: string,
  birthdate: string
): Promise<{ data: { applicant: Applicant; roadmap: StageRoadmapItem[] } | null; error: string | null }> {
  const supabase = await createClient();

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  if (error || !applicant) return { data: null, error: 'Applicant not found' };

  if (applicant.birthdate !== birthdate) return { data: null, error: 'Invalid reference number or birthdate' };

  const { data: stageRows } = await supabase
    .from('stage_results')
    .select('stage_name, stage_sequence, result_status, current_stage_label')
    .eq('reference_no', referenceNo)
    .order('stage_sequence', { ascending: true });

  const workflow = getStageWorkflow(applicant.position_applied, applicant.experience_level);
  const currentStage = applicant.current_stage || 'Initial Screening';
  const currentIdx = workflow.indexOf(currentStage);

  const roadmap: StageRoadmapItem[] = workflow.map((stageName, idx) => {
    const stageData = stageRows?.find((s) => s.stage_name === stageName);
    return {
      stageName,
      sequence: idx + 1,
      status: idx < currentIdx ? 'completed' : stageName === currentStage ? 'current' : 'pending',
      result: stageData?.result_status,
      label: stageData?.current_stage_label,
    };
  });

  return { data: { applicant: applicant as Applicant, roadmap }, error: null };
}

export async function getApplicantInfo(referenceNo: string): Promise<{ data: any; error: string | null }> {
  const supabase = await createClient();

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  if (error || !applicant) return { data: null, error: 'Applicant not found' };

  if (applicant.position_applied !== 'Dealer') {
    return { data: null, error: 'Math exam is only available for Dealer applicants' };
  }

  if (applicant.application_status === 'Completed' || applicant.application_status === 'Passed' || applicant.application_status === 'Not Recommended') {
    return { data: null, error: 'notEligible' };
  }

  const { data: attempt } = await supabase
    .from('math_exam_results')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  return {
    data: {
      referenceNo: applicant.reference_no,
      lastName: applicant.last_name,
      firstName: applicant.first_name,
      middleName: applicant.middle_name,
      alreadyTaken: !!attempt && attempt.attempt_status !== 'IN_PROGRESS',
      previousResult: attempt,
    },
    error: null,
  };
}