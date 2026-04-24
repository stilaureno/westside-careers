import { createClient } from '@/lib/supabase/server';
import type { Applicant, DashboardSummary, StageRoadmapItem } from '@/types';

export function computeAge(birthdate: string): number {
  const dob = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function computeBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

export function buildDuplicateKey(
  lastName: string,
  firstName: string,
  middleName: string,
  birthdate: string,
  contactNumber: string
): string {
  return (
    [lastName, firstName, middleName, birthdate, contactNumber]
      .map((v) => (v || 'n/a').toLowerCase().replace(/\s+/g, ''))
      .join('|')
  );
}

export function generateReferenceNo(): string {
  const now = new Date();
  const pad = (n: number, width: number) =>
    String(n).padStart(width, '0');
  return (
    'APP-' +
    now.getFullYear() +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2) +
    pad(now.getHours(), 2) +
    pad(now.getMinutes(), 2) +
    pad(now.getSeconds(), 2)
  );
}

export function generateApplicantId(): string {
  return (
    'AID-' +
    Math.random().toString(16).slice(2, 10).toUpperCase()
  );
}

export function getStageSequence(position: string, experienceLevel: string | undefined): number {
  return 1;
}

export function getNextStage(currentStage: string, position: string, experienceLevel: string | undefined): string {
  const stages = getStageWorkflow(position, experienceLevel);
  const idx = stages.indexOf(currentStage);
  if (idx === -1 || idx === stages.length - 1) return 'Completed';
  return stages[idx + 1];
}

export function getStageWorkflow(position: string, experienceLevel: string | undefined): string[] {
  if (position === 'Dealer') {
    if (experienceLevel === 'Experienced Dealer') {
      return ['Initial Screening', 'Math Exam', 'Table Test', 'Final Interview'];
    }
    return ['Initial Screening', 'Math Exam', 'Final Interview'];
  }
  if (position === 'Pit Supervisor' || position === 'Pit Manager' || position === 'Operations Manager') {
    return ['Initial Screening', 'Final Interview'];
  }
  return ['Initial Screening'];
}

export async function getDashboardSummary(
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> {
  const supabase = await createClient();

  let query = supabase
    .from('applicants')
    .select('application_status, current_stage, position_applied, gender, birthdate');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59');
  }

  const { data: rows, error } = await query;

  if (error || !rows) {
    return { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0, byPosition: {}, byGender: {}, byAgeBand: {} };
  }

  const summary: DashboardSummary = {
    total: rows.length,
    pending: 0,
    ongoing: 0,
    qualified: 0,
    reprofile: 0,
    pooling: 0,
    failed: 0,
    byPosition: {},
    byGender: { Male: 0, Female: 0 },
    byAgeBand: {},
  };

  rows.forEach((row) => {
    const status = row.application_status || 'Pending';
    if (status === 'Pending') summary.pending++;
    else if (status === 'Ongoing') summary.ongoing++;
    else if (status === 'Passed' || status === 'Completed') summary.qualified++;
    else if (status === 'Reprofile') summary.reprofile++;
    else if (status === 'For Pooling') summary.pooling++;
    else if (status === 'Failed' || status === 'Not Recommended') summary.failed++;

    const pos = row.position_applied || 'Unknown';
    summary.byPosition[pos] = (summary.byPosition[pos] || 0) + 1;

    const gender = row.gender || 'Unknown';
    if (gender === 'Male' || gender === 'Female') {
      summary.byGender[gender] = (summary.byGender[gender] || 0) + 1;
    }

    const age = computeAge(row.birthdate);
    const band = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : '45+';
    summary.byAgeBand[band] = (summary.byAgeBand[band] || 0) + 1;
  });

  return summary;
}

export async function getApplicantByReference(referenceNo: string): Promise<{ data: Applicant | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  if (error) return { data: null, error: 'Applicant not found' };
  return { data: data as Applicant, error: null };
}

export async function getApplicantStageRoadmap(referenceNo: string): Promise<StageRoadmapItem[]> {
  const supabase = await createClient();

  const { data: applicant } = await supabase
    .from('applicants')
    .select('position_applied, experience_level, current_stage, application_status')
    .eq('reference_no', referenceNo)
    .single();

  if (!applicant) return [];

  const { data: stages } = await supabase
    .from('stage_results')
    .select('stage_name, stage_sequence, result_status, current_stage_label')
    .eq('reference_no', referenceNo)
    .order('stage_sequence', { ascending: true });

  const workflow = getStageWorkflow(applicant.position_applied, applicant.experience_level);
  const currentStage = applicant.current_stage || 'Initial Screening';
  const currentIdx = workflow.indexOf(currentStage);

  return workflow.map((stageName, idx) => {
    const stageData = stages?.find((s) => s.stage_name === stageName);
    const isCompleted = idx < currentIdx;
    const isCurrent = stageName === currentStage;

    return {
      stageName,
      sequence: idx + 1,
      status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending',
      result: stageData?.result_status,
      label: stageData?.current_stage_label,
    };
  });
}

export async function getApplicantSummaryData(): Promise<Applicant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return data as Applicant[];
}