import { createClient } from '@/lib/supabase/server';
import type { StageResult } from '@/types';
import { getNextStage, getStageWorkflow } from './applicants';

const COMPLETED_STAGE_STATUSES = new Set([
  'Passed',
  'Failed',
  'Reprofile',
  'For Pooling',
  'Not Recommended',
]);

export async function upsertStageResult(payload: {
  referenceNo: string;
  stageName: string;
  stageSequence: number;
  resultStatus: string;
  currentStageLabel: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  heightCm?: number;
  weightKg?: number;
  bmiValue?: number;
  bmiResult?: string;
  colorBlindResult?: string;
  visibleTattoo?: string;
  invisibleTattoo?: string;
  sweatyPalmResult?: string;
  reprofileDepartment?: string;
  reprofilePosition?: string;
  reprofileExperienceLevel?: string;
  originalPosition?: string;
  originalDepartment?: string;
  originalExperienceLevel?: string;
  editReason?: string;
  score?: number;
  passingScore?: number;
  maxScore?: number;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const meta = await getApplicantMeta(payload.referenceNo);
  const { applicant_id, position_applied, experience_level } = meta;
  if (!applicant_id) return { success: false, error: 'Applicant not found' };

  const workflow = await getStageWorkflowForApplicant(position_applied || '', experience_level);
  const requestedStageIndex = workflow.indexOf(payload.stageName);
  if (requestedStageIndex === -1) {
    return { success: false, error: `Invalid stage "${payload.stageName}" for this applicant.` };
  }

  const { data: recordedStages, error: recordedStagesError } = await supabase
    .from('stage_results')
    .select('stage_name, result_status')
    .eq('reference_no', payload.referenceNo);

  if (recordedStagesError) {
    return { success: false, error: recordedStagesError.message };
  }

  const firstIncompleteStageIndex = getFirstIncompleteStageIndex(
    workflow,
    recordedStages || []
  );

  if (firstIncompleteStageIndex !== -1 && requestedStageIndex > firstIncompleteStageIndex) {
    return {
      success: false,
      error: `Cannot skip stages. Complete "${workflow[firstIncompleteStageIndex]}" first.`,
    };
  }

  const nextStage = getNextStage(payload.stageName, position_applied || '', experience_level);
  const isFinalInterview = payload.stageName === 'Final Interview';
  const applicationStatus = getApplicationStatus(payload.stageName, payload.resultStatus);
  const overallResult = payload.resultStatus;

  const { data: existing } = await supabase
    .from('stage_results')
    .select('id, result_status, score, passing_score, max_score, remarks, evaluated_by, evaluated_at')
    .eq('reference_no', payload.referenceNo)
    .eq('stage_name', payload.stageName)
    .single();

  let stageResult;
  let latestVersionNumber = 0;
  if (existing) {
    const { data: existingVersions } = await supabase
      .from('stage_result_versions')
      .select('version_number')
      .eq('stage_result_id', existing.id)
      .order('version_number', { ascending: false })
      .limit(1);

    latestVersionNumber = existingVersions?.[0]?.version_number || 0;

    // Backfill legacy rows that predate version tracking so pre-edit values are retained.
    if (latestVersionNumber === 0) {
      const { error: backfillError } = await supabase
        .from('stage_result_versions')
        .insert({
          stage_result_id: existing.id,
          version_number: 1,
          result_status: existing.result_status,
          score: existing.score,
          passing_score: existing.passing_score,
          max_score: existing.max_score,
          remarks: existing.remarks,
          evaluated_by: existing.evaluated_by,
          evaluated_at: existing.evaluated_at || new Date().toISOString(),
          created_by: existing.evaluated_by || payload.evaluatedBy,
          edit_reason: 'Initial entry',
        });

      if (backfillError) return { success: false, error: backfillError.message };
      latestVersionNumber = 1;
    }

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
        reprofile_department: payload.reprofileDepartment,
        reprofile_position: payload.reprofilePosition,
        original_position: payload.resultStatus === 'Reprofile' ? payload.originalPosition : null,
        original_department: payload.resultStatus === 'Reprofile' ? payload.originalDepartment : null,
        original_experience_level: payload.resultStatus === 'Reprofile' ? payload.originalExperienceLevel : null,
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
        reprofile_department: payload.reprofileDepartment,
        reprofile_position: payload.reprofilePosition,
        original_position: payload.resultStatus === 'Reprofile' ? payload.originalPosition : null,
        original_department: payload.resultStatus === 'Reprofile' ? payload.originalDepartment : null,
        original_experience_level: payload.resultStatus === 'Reprofile' ? payload.originalExperienceLevel : null,
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

  const { data: allStageResults } = await supabase
    .from('stage_results')
    .select('stage_name, result_status')
    .eq('reference_no', payload.referenceNo)
    .order('stage_sequence', { ascending: true });

  const dynamicStatus = calculateApplicationStatus(
    allStageResults || [],
    position_applied || '',
    experience_level
  );

  await supabase
    .from('applicants')
    .update({
      current_stage: isFinalInterview ? 'Completed' : payload.stageName,
      application_status: dynamicStatus,
      overall_result: overallResult,
      department: payload.resultStatus === 'Reprofile' && payload.reprofileDepartment ? payload.reprofileDepartment : undefined,
      position_applied: payload.resultStatus === 'Reprofile' && payload.reprofilePosition ? payload.reprofilePosition : undefined,
      experience_level: payload.resultStatus === 'Reprofile'
        ? (payload.reprofilePosition === 'Dealer'
          ? (payload.reprofileExperienceLevel || null)
          : null)
        : undefined,
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
      notification_message: getStageInstruction(payload.stageName, payload.resultStatus, payload.reprofilePosition, payload.reprofileDepartment),
      visible_to_applicant: 'Yes',
      created_by: payload.evaluatedBy,
    });

  // Create version record for history tracking
  if (stageResult?.id) {
    const nextVersion = existing ? latestVersionNumber + 1 : 1;

    await supabase
      .from('stage_result_versions')
      .insert({
        stage_result_id: stageResult.id,
        version_number: nextVersion,
        result_status: payload.resultStatus,
        score: payload.score,
        passing_score: payload.passingScore,
        max_score: payload.maxScore,
        remarks: payload.remarks,
        evaluated_by: payload.evaluatedBy,
        evaluated_at: payload.evaluatedAt || new Date().toISOString(),
        created_by: payload.evaluatedBy,
        edit_reason: payload.editReason || (nextVersion === 1 ? 'Initial entry' : 'Updated result'),
      });
  }

  return { success: true };
}

async function getApplicantMeta(referenceNo: string): Promise<{ applicant_id?: string; position_applied?: string; experience_level?: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('applicants')
    .select('applicant_id, position_applied, experience_level')
    .eq('reference_no', referenceNo)
    .single();
  return data as { applicant_id?: string; position_applied?: string; experience_level?: string } || {};
}

function getFirstIncompleteStageIndex(
  workflow: string[],
  stageResults: Array<{ stage_name: string; result_status: string | null }>
): number {
  const stageResultMap = new Map(
    stageResults.map((stageResult) => [stageResult.stage_name, stageResult.result_status])
  );

  for (let index = 0; index < workflow.length; index++) {
    const status = stageResultMap.get(workflow[index]);
    if (!status || !COMPLETED_STAGE_STATUSES.has(status)) {
      return index;
    }
  }

  return -1;
}

async function getStageWorkflowForApplicant(position: string, experienceLevel?: string): Promise<string[]> {
  const supabase = await createClient();
  const normalizedExperienceLevel = experienceLevel === 'Experienced Dealer' ? 'Experienced' : 'Non-Experienced';

  const { data: positionData, error: positionError } = await supabase
    .from('positions')
    .select('id')
    .eq('name', position)
    .single();

  if (positionError || !positionData) {
    return getStageWorkflow(position, experienceLevel);
  }

  const { data: positionStages, error: positionStagesError } = await supabase
    .from('position_stages')
    .select('stage_id, stage_order')
    .eq('position_id', positionData.id)
    .eq('experience_level', normalizedExperienceLevel)
    .eq('is_enabled', true)
    .order('stage_order', { ascending: true });

  if (positionStagesError || !positionStages || positionStages.length === 0) {
    return getStageWorkflow(position, experienceLevel);
  }

  const stageIds = positionStages.map((positionStage) => positionStage.stage_id);
  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, name')
    .in('id', stageIds);

  if (stagesError || !stages) {
    return getStageWorkflow(position, experienceLevel);
  }

  const stageNameById = new Map(stages.map((stage) => [stage.id, stage.name]));
  const workflow = positionStages
    .map((positionStage) => stageNameById.get(positionStage.stage_id))
    .filter((stageName): stageName is string => Boolean(stageName));

  return workflow.length > 0 ? workflow : getStageWorkflow(position, experienceLevel);
}

export function calculateApplicationStatus(
  stageResults: { stage_name: string; result_status: string }[],
  position: string,
  experienceLevel?: string | null
): string {
  if (!stageResults || stageResults.length === 0) return 'Pending';

  const workflow = getStageWorkflow(position, experienceLevel || undefined);

  const lastResult = stageResults[stageResults.length - 1];
  const lastStageName = lastResult?.stage_name;
  const lastStatus = lastResult?.result_status;

  const finalStageIdx = workflow.indexOf('Final Interview');
  const lastStageIdx = workflow.indexOf(lastStageName);

  if (lastStageIdx === finalStageIdx && finalStageIdx !== -1) {
    if (lastStatus === 'Passed') return 'Completed';
    if (lastStatus === 'Reprofile') return 'Reprofile';
    if (lastStatus === 'For Pooling') return 'For Pooling';
    if (lastStatus === 'Not Recommended') return 'Not Recommended';
    if (lastStatus === 'Failed') return 'Failed';
    return lastStatus;
  }

  if (lastStatus === 'Passed') return 'Ongoing';
  if (lastStatus === 'Failed') return 'Failed';
  if (lastStatus === 'Reprofile') return 'Reprofile';
  if (lastStatus === 'For Pooling') return 'For Pooling';
  if (lastStatus === 'Not Recommended') return 'Not Recommended';

  return lastStatus || 'Pending';
}

function calculateDealerStatus(stageResults: { stage_name: string; result_status: string }[]): string {
  const stageNames: Record<string, string[]> = {
    'Initial Screening': ['Passed', 'Failed'],
    'Math Exam': ['Passed', 'Failed'],
    'Table Test': ['Passed', 'Failed'],
    'Sweaty Palm': ['Passed', 'Failed'],
    'Final Interview': ['Passed', 'Reprofile', 'For Pooling', 'Not Recommended', 'Failed'],
  };
  const order = ['Initial Screening', 'Math Exam', 'Table Test', 'Sweaty Palm', 'Final Interview'];
  for (let i = order.length - 1; i >= 0; i--) {
    const s = stageResults.find(r => r.stage_name === order[i]);
    if (s) {
      if (s.result_status === 'Passed') {
        if (order[i] === 'Final Interview') return 'Completed';
        return 'Ongoing';
      }
      return s.result_status;
    }
  }
  return 'Pending';
}

function getApplicationStatus(stageName: string, resultStatus: string): string {
  if (stageName === 'Final Interview') {
    if (resultStatus === 'Passed') return 'Completed';
    return resultStatus;
  }

  if (resultStatus === 'Passed') return 'Ongoing';
  return resultStatus;
}

function getStageInstruction(stageName: string, resultStatus: string, reprofilePosition?: string, reprofileDepartment?: string): string {
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
      return 'Congratulations! You have passed all stages. Please follow the next instructions provided by the final interviewer.';
    }
    if (resultStatus === 'Reprofile') {
      if (reprofilePosition && reprofileDepartment) {
        return `You have been Reprofiled for ${reprofilePosition} in ${reprofileDepartment}. Please check for other available positions.`;
      }
      if (reprofilePosition) {
        return `You have been Reprofiled for ${reprofilePosition}. Please check for other available positions.`;
      }
      return 'You have been Reprofiled. Please check for other available positions.';
    }
    if (resultStatus === 'For Pooling') {
      return 'You have been placed in the candidate pool. We will contact you when a position becomes available.';
    }
    return 'Unfortunately, you were not recommended for this position.';
  }
  return '';
}
