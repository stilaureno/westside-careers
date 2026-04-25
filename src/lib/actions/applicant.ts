'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { computeBMI, buildDuplicateKey, generateReferenceNo, generateApplicantId, getStageWorkflow, getNextStage } from '@/lib/db/applicants';
import type { ApplicationFormData, Applicant, StageRoadmapItem } from '@/types';

const STATUS_CHECK_FAILURES_COOKIE = 'status_check_failures';
const STATUS_CHECK_LOCK_COOKIE = 'status_check_lock_until';
const STATUS_CHECK_LIMIT = 5;
const STATUS_CHECK_LOCK_MINUTES = 5;

function getStatusCheckCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

async function getActiveStatusLock(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const lockValue = cookieStore.get(STATUS_CHECK_LOCK_COOKIE)?.value;
  if (!lockValue) return null;

  const lockedUntil = Number(lockValue);
  if (!Number.isFinite(lockedUntil) || lockedUntil <= Date.now()) {
    cookieStore.delete(STATUS_CHECK_LOCK_COOKIE);
    cookieStore.delete(STATUS_CHECK_FAILURES_COOKIE);
    return null;
  }

  return lockedUntil;
}

async function resetStatusCheckState(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete(STATUS_CHECK_FAILURES_COOKIE);
  cookieStore.delete(STATUS_CHECK_LOCK_COOKIE);
}

async function recordFailedStatusCheck(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const currentFailures = Number(cookieStore.get(STATUS_CHECK_FAILURES_COOKIE)?.value || '0');
  const nextFailures = currentFailures + 1;

  if (nextFailures >= STATUS_CHECK_LIMIT) {
    const lockedUntil = Date.now() + STATUS_CHECK_LOCK_MINUTES * 60 * 1000;
    cookieStore.set(STATUS_CHECK_LOCK_COOKIE, String(lockedUntil), {
      ...getStatusCheckCookieOptions(),
      maxAge: STATUS_CHECK_LOCK_MINUTES * 60,
    });
    cookieStore.delete(STATUS_CHECK_FAILURES_COOKIE);
    return lockedUntil;
  }

  cookieStore.set(STATUS_CHECK_FAILURES_COOKIE, String(nextFailures), {
    ...getStatusCheckCookieOptions(),
    maxAge: STATUS_CHECK_LOCK_MINUTES * 60,
  });
  return null;
}

function getStatusLockError(lockedUntil: number) {
  const remainingMs = Math.max(lockedUntil - Date.now(), 0);
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `Too many failed status checks. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`;
}

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
      department: formData.department,
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
): Promise<{ data: { applicant: Applicant; roadmap: StageRoadmapItem[]; mathExam: { score: number | null; passed: boolean | null; takenAt: string | null; status: string | null } | null; nextStep: string | null } | null; error: string | null; lockedUntil?: number | null }> {
  const cookieStore = await cookies();
  const activeLock = await getActiveStatusLock(cookieStore);
  if (activeLock) {
    return { data: null, error: getStatusLockError(activeLock), lockedUntil: activeLock };
  }

  const supabase = await createClient();

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  if (error || !applicant) {
    const lockedUntil = await recordFailedStatusCheck(cookieStore);
    return {
      data: null,
      error: lockedUntil ? getStatusLockError(lockedUntil) : 'Applicant not found',
      lockedUntil,
    };
  }

  if (applicant.birthdate !== birthdate) {
    const lockedUntil = await recordFailedStatusCheck(cookieStore);
    return {
      data: null,
      error: lockedUntil ? getStatusLockError(lockedUntil) : 'Invalid reference number or birthdate',
      lockedUntil,
    };
  }

  await resetStatusCheckState(cookieStore);

  const { data: stageRows } = await supabase
    .from('stage_results')
    .select('stage_name, stage_sequence, result_status, current_stage_label')
    .eq('reference_no', referenceNo)
    .order('stage_sequence', { ascending: true });

  let mathExam = null;
  if (applicant.position_applied === 'Dealer') {
    const { data: mathExamRow } = await supabase
      .from('math_exam_results')
      .select('score, status, submitted_at, attempt_status')
      .eq('reference_no', referenceNo)
      .single();

    if (mathExamRow) {
      mathExam = {
        score: mathExamRow.score ?? null,
        passed: mathExamRow.status === 'Passed',
        takenAt: mathExamRow.submitted_at,
        status: mathExamRow.attempt_status,
      };
    }
  }

const workflow = getStageWorkflow(applicant.position_applied, applicant.experience_level);
  
  const completedStages = stageRows?.filter(s => s.result_status === 'Passed' || s.result_status === 'Failed') || [];
  const lastCompletedIdx = completedStages.length;
  
  let currentStage: string;
  let currentIdx: number;
  
  if (lastCompletedIdx >= workflow.length) {
    currentStage = workflow[workflow.length - 1];
    currentIdx = workflow.length - 1;
  } else {
    currentStage = workflow[lastCompletedIdx];
    currentIdx = lastCompletedIdx;
  }
  
  const roadmap: StageRoadmapItem[] = workflow.map((stageName, idx) => {
    const stageData = stageRows?.find((s) => s.stage_name === stageName);
    return {
      stageName,
      sequence: idx + 1,
      status: idx < currentIdx ? 'completed' : stageName === currentStage ? 'current' : 'pending',
      result: undefined,
      label: stageData?.current_stage_label,
    };
  });

  let nextStep: string | null = null;
  const allStagesCompleted = lastCompletedIdx >= workflow.length;
  
  if (allStagesCompleted) {
    nextStep = 'You have completed the Hiring Portal process for the Dealer position, including the Initial Screening, Math Exam, and Final Interview stages. Please follow the next instructions provided by the final interviewer.\n\nFor application monitoring purposes, please create your Darwinbox account, complete all required information, and select the position you applied for today.\n\nDarwinbox link = westsideresort.darwinbox.com/ms/candidatev2/main/auth/login';
  } else if (lastCompletedIdx < workflow.length) {
    nextStep = workflow[lastCompletedIdx];
  }

  return { data: { applicant: applicant as Applicant, roadmap, mathExam, nextStep }, error: null, lockedUntil: null };
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
