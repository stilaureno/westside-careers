import { createClient } from '@/lib/supabase/server';
import type { StageResult } from '@/types';
import { getNextStage } from './applicants';

export async function upsertStageResult(payload: {
  referenceNo: string;
  stageName: string;
  stageSequence: number;
  resultStatus: string;
  currentStageLabel: string;
  evaluatedBy?: string;
  heightCm?: number;
  weightKg?: number;
  bmiValue?: number;
  bmiResult?: string;
  colorBlindResult?: string;
  visibleTattoo?: string;
  invisibleTattoo?: string;
  sweatyPalmResult?: string;
  score?: number;
  passingScore?: number;
  maxScore?: number;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const meta = await getApplicantMeta(payload.referenceNo);
  const { applicant_id, position_applied, experience_level } = meta;
  if (!applicant_id) return { success: false, error: 'Applicant not found' };

  const nextStage = getNextStage(payload.stageName, position_applied || '', experience_level);
  const isFinalInterview = payload.stageName === 'Final Interview';
  const applicationStatus = getApplicationStatus(payload.stageName, payload.resultStatus);
  const overallResult = payload.resultStatus;

  const { data: existing } = await supabase
    .from('stage_results')
    .select('id')
    .eq('reference_no', payload.referenceNo)
    .eq('stage_name', payload.stageName)
    .single();

  let stageResult;
  if (existing) {
    const { data, error } = await supabase
      .from('stage_results')
      .update({
        result_status: payload.resultStatus,
        current_stage_label: payload.currentStageLabel,
        height_cm: payload.heightCm,
        weight_kg: payload.weightKg,
        bmi_value: payload.bmiValue,
        bmi_result: payload.bmiResult,
        color_blind_result: payload.colorBlindResult,
        visible_tattoo: payload.visibleTattoo,
        invisible_tattoo: payload.invisibleTattoo,
        sweaty_palm_result: payload.sweatyPalmResult,
        score: payload.score,
        passing_score: payload.passingScore,
        max_score: payload.maxScore,
        remarks: payload.remarks,
        evaluated_by: payload.evaluatedBy,
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    stageResult = data;
    if (error) return { success: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('stage_results')
      .insert({
        applicant_id,
        reference_no: payload.referenceNo,
        stage_name: payload.stageName,
        stage_sequence: payload.stageSequence,
        result_status: payload.resultStatus,
        current_stage_label: payload.currentStageLabel,
        height_cm: payload.heightCm,
        weight_kg: payload.weightKg,
        bmi_value: payload.bmiValue,
        bmi_result: payload.bmiResult,
        color_blind_result: payload.colorBlindResult,
        visible_tattoo: payload.visibleTattoo,
        invisible_tattoo: payload.invisibleTattoo,
        sweaty_palm_result: payload.sweatyPalmResult,
        score: payload.score,
        passing_score: payload.passingScore,
        max_score: payload.maxScore,
        remarks: payload.remarks,
        evaluated_by: payload.evaluatedBy,
        evaluated_at: new Date().toISOString(),
      })
      .select()
      .single();
    stageResult = data;
    if (error) return { success: false, error: error.message };
  }

  await supabase
    .from('applicants')
    .update({
      current_stage: isFinalInterview ? 'Completed' : payload.stageName,
      application_status: applicationStatus,
      overall_result: overallResult,
      updated_at: new Date().toISOString(),
    })
    .eq('reference_no', payload.referenceNo);

  await supabase
    .from('applicant_notifications')
    .insert({
      applicant_id,
      reference_no: payload.referenceNo,
      stage_name: payload.stageName,
      result_status: payload.resultStatus,
      notification_message: getStageInstruction(payload.stageName, payload.resultStatus),
      visible_to_applicant: 'Yes',
      created_by: payload.evaluatedBy,
    });

  return { success: true };
}

async function getApplicantMeta(referenceNo: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('applicants')
    .select('applicant_id, position_applied, experience_level')
    .eq('reference_no', referenceNo)
    .single();
  return data as { applicant_id?: string; position_applied?: string; experience_level?: string } || {};
}

function getApplicationStatus(stageName: string, resultStatus: string): string {
  if (stageName === 'Final Interview') {
    if (resultStatus === 'Passed') return 'Completed';
    return resultStatus;
  }

  if (resultStatus === 'Passed') return 'Ongoing';
  return resultStatus;
}

function getStageInstruction(stageName: string, resultStatus: string): string {
  if (stageName === 'Initial Screening') {
    if (resultStatus === 'Passed') return 'Please proceed to the Math Exam Area.';
    return 'Unfortunately, you did not pass the Initial Screening.';
  }
  if (stageName === 'Math Exam') {
    if (resultStatus === 'Passed') return 'Congratulations! Please proceed to the next stage.';
    return 'Unfortunately, you did not pass the Math Exam.';
  }
  if (stageName === 'Table Test') {
    if (resultStatus === 'Passed') return 'Congratulations! Please proceed to the Final Interview.';
    return 'Unfortunately, you did not pass the Table Test.';
  }
  if (stageName === 'Final Interview') {
    if (resultStatus === 'Passed') {
      return 'Congratulations! You have passed all stages. Please create your account at https://westsideresort.darwinbox.com/ms/candidatev2/main/auth/login to proceed with your application.';
    }
    if (resultStatus === 'Reprofile') {
      return 'You have been Reprofiled. Please check for other available positions.';
    }
    if (resultStatus === 'For Pooling') {
      return 'You have been placed in the candidate pool. We will contact you when a position becomes available.';
    }
    return 'Unfortunately, you were not recommended for this position.';
  }
  return '';
}
