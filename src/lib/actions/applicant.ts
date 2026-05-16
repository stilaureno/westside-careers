'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { computeBMI, buildDuplicateKey, generateReferenceNo, generateApplicantId, getStageWorkflow, getStageWorkflowFromDB, getNextStage, checkDuplicateApplicant } from '@/lib/db/applicants';
import type { ApplicationFormData, Applicant, StageRoadmapItem } from '@/types';

const STATUS_CHECK_FAILURES_COOKIE = 'status_check_failures';
const STATUS_CHECK_LOCK_COOKIE = 'status_check_lock_until';
const STATUS_CHECK_LIMIT = 5;
const STATUS_CHECK_LOCK_MINUTES = 5;

function sanitizeName(name: string | undefined): string {
  if (!name) return '';
  const cleaned = name.trim().replace(/[^a-zA-Z\s\-']/g, '');
  return cleaned
    .split(/[\s\-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function sanitizeBasic(name: string | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/[\s\-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

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

function isCompletedStageResult(stageName: string, resultStatus?: string | null) {
  if (!resultStatus) return false;
  if (resultStatus === 'Passed' || resultStatus === 'Failed') return true;
  if (stageName === 'Final Interview' && (resultStatus === 'Reprofile' || resultStatus === 'For Pooling' || resultStatus === 'Not Recommended')) {
    return true;
  }
  return false;
}

export async function submitApplication(formData: ApplicationFormData): Promise<{ success: boolean; referenceNo?: string; error?: string }> {
  const supabase = await createClient();

  const age = Math.floor((Date.now() - new Date(formData.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 21) {
    return { success: false, error: 'You must be at least 21 years old to apply.' };
  }

  const duplicateCheck = await checkDuplicateApplicant(
    formData.lastName,
    formData.firstName,
    formData.birthdate,
    formData.emailAddress
  );

  if (duplicateCheck.found && duplicateCheck.referenceNo) {
    return {
      success: false,
      error: `An application with this information already exists. Your reference number is: ${duplicateCheck.referenceNo}. Please use the Status Check page to view your application.`,
    };
  }

  const bmi = formData.heightCm && formData.weightKg ? computeBMI(formData.heightCm, formData.weightKg) : null;
  const duplicateKey = buildDuplicateKey(
    sanitizeName(formData.lastName),
    sanitizeBasic(formData.firstName),
    sanitizeBasic(formData.middleName) || '',
    formData.birthdate,
    formData.contactNumber
  );
  const referenceNo = generateReferenceNo();
  const applicantId = generateApplicantId();
  const workflow = getStageWorkflow(formData.positionApplied, formData.experienceLevel);

  const { error } = await supabase
    .from('applicants')
    .insert({
      applicant_id: applicantId,
      reference_no: referenceNo,
      last_name: sanitizeName(formData.lastName),
      first_name: sanitizeBasic(formData.firstName),
      middle_name: sanitizeBasic(formData.middleName) || null,
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
      applicant_number: formData.applicantNumber || null,
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
  lastName: string,
  birthdate: string
): Promise<{ data: { applicant: Applicant; roadmap: StageRoadmapItem[]; mathExam: { score: number | null; passed: boolean | null; takenAt: string | null; status: string | null } | null; nextStep: string | null; hasFeedback: boolean } | null; error: string | null; lockedUntil?: number | null }> {
  const cookieStore = await cookies();
  const activeLock = await getActiveStatusLock(cookieStore);
  if (activeLock) {
    return { data: null, error: getStatusLockError(activeLock), lockedUntil: activeLock };
  }

  const supabase = await createClient();

  const sanitizedLastName = sanitizeName(lastName);

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select('*')
    .ilike('last_name', sanitizedLastName)
    .eq('birthdate', birthdate)
    .single();

  if (error || !applicant) {
    const lockedUntil = await recordFailedStatusCheck(cookieStore);
    return {
      data: null,
      error: lockedUntil ? getStatusLockError(lockedUntil) : 'Applicant not found',
      lockedUntil,
    };
  }

  await resetStatusCheckState(cookieStore);

  const referenceNo = applicant.reference_no;

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

const workflow = await getStageWorkflowFromDB(applicant.position_applied, applicant.experience_level);
  
  const completedStages = stageRows?.filter(s => isCompletedStageResult(s.stage_name, s.result_status)) || [];
  const lastCompletedIdx = completedStages.length;
  const allStagesCompleted = lastCompletedIdx >= workflow.length;
  
  let currentStage: string;
  let currentIdx: number;
  
  if (allStagesCompleted) {
    currentStage = workflow[workflow.length - 1];
    currentIdx = workflow.length - 1;
  } else {
    currentStage = workflow[lastCompletedIdx];
    currentIdx = lastCompletedIdx;
  }
  
  const roadmap: StageRoadmapItem[] = workflow.map((stageName, idx) => {
    const stageData = stageRows?.find((s) => s.stage_name === stageName);
    const isLastStage = idx === workflow.length - 1;
    return {
      stageName,
      sequence: idx + 1,
      status: allStagesCompleted && isLastStage ? 'completed' : idx < currentIdx ? 'completed' : stageName === currentStage ? 'current' : 'pending',
      result: undefined,
      label: stageData?.current_stage_label,
    };
  });

  let nextStep: string | null = null;
  
  if (allStagesCompleted) {
    nextStep = `Thank you for applying! We appreciate your time and interest in joining our team. We will update you on your application status via email or the contact number you provided. Keep an eye on your inbox for further updates.`;
  } else if (lastCompletedIdx < workflow.length) {
    nextStep = workflow[lastCompletedIdx];
  }

  const { data: existingFeedback } = await supabase
    .from('application_feedback')
    .select('id')
    .eq('reference_no', referenceNo)
    .single();

  const hasFeedback = !!existingFeedback;

  return { data: { applicant: applicant as Applicant, roadmap, mathExam, nextStep, hasFeedback }, error: null, lockedUntil: null };
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

export async function deleteApplicant(referenceNo: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error: deleteNotif } = await supabase
    .from('applicant_notifications')
    .delete()
    .eq('reference_no', referenceNo);

  if (deleteNotif) {
    return { success: false, error: deleteNotif.message };
  }

  const { error: deleteGames } = await supabase
    .from('applicant_games')
    .delete()
    .eq('reference_no', referenceNo);

  if (deleteGames) {
    return { success: false, error: deleteGames.message };
  }

  const { error: deleteExam } = await supabase
    .from('math_exam_results')
    .delete()
    .eq('reference_no', referenceNo);

  if (deleteExam) {
    return { success: false, error: deleteExam.message };
  }

  const { error: deleteStages } = await supabase
    .from('stage_results')
    .delete()
    .eq('reference_no', referenceNo);

  if (deleteStages) {
    return { success: false, error: deleteStages.message };
  }

  const { error: deleteApplicant } = await supabase
    .from('applicants')
    .delete()
    .eq('reference_no', referenceNo);

  if (deleteApplicant) {
    return { success: false, error: deleteApplicant.message };
  }

  return { success: true };
}

export async function updateApplicantBasicInfo(
  referenceNo: string,
  updates: { first_name?: string; last_name?: string; middle_name?: string; birthdate?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};
  if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
  if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
  if (updates.middle_name !== undefined) updateData.middle_name = updates.middle_name;
  if (updates.birthdate !== undefined) {
    updateData.birthdate = updates.birthdate;
    if (updates.birthdate) {
      const age = Math.floor((Date.now() - new Date(updates.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      updateData.age = age;
    }
  }

  const { error } = await supabase
    .from('applicants')
    .update(updateData)
    .eq('reference_no', referenceNo);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
