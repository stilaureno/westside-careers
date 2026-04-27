import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Applicant, DashboardSummary, StageRoadmapItem, PositionSummary, StageSummary, GenderByPosition } from '@/types';

export interface ApplicantStageSummary {
  reference_no: string;
  stage_name: string;
  stage_sequence: number;
  result_status: string | null;
  current_stage_label: string | null;
  remarks: string | null;
  sweaty_palm_result?: string | null;
}

export interface ApplicantListItem extends Applicant {
  displayName: string;
  initialScreeningResult: string;
  mathExamResult: string;
  tableTestResult: string;
  sweatyPalmResult: string;
  finalInterviewResult: string;
  remarks?: string;
  stages: ApplicantStageSummary[];
}

function emptyPositionSummary(): PositionSummary {
  return { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 };
}

function emptyStageSummary(): StageSummary {
  return { taken: 0, pending: 0, passed: 0, failed: 0 };
}

function emptyGenderByPosition(): GenderByPosition {
  return {
    dealerNonExpMale: 0, dealerNonExpFemale: 0,
    dealerExpMale: 0, dealerExpFemale: 0,
    pitSupervisorMale: 0, pitSupervisorFemale: 0,
    pitManagerMale: 0, pitManagerFemale: 0,
    operationsManagerMale: 0, operationsManagerFemale: 0,
  };
}

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

export async function getStageWorkflowFromDB(position: string, experienceLevel: string | undefined): Promise<string[]> {
  try {
    const expLevel = experienceLevel === 'Experienced Dealer' ? 'Experienced' : 'Non-Experienced';
    const supabase = createBrowserClient();
    
    const { data: positionData } = await supabase
      .from('positions')
      .select('id')
      .eq('name', position)
      .single();
    
    if (!positionData) return getStageWorkflow(position, experienceLevel);
    
    const { data: stageData } = await supabase
      .from('position_stages')
      .select('stage_id, stage_order')
      .eq('position_id', positionData.id)
      .eq('experience_level', expLevel)
      .eq('is_enabled', true)
      .order('stage_order');
    
    if (!stageData || stageData.length === 0) return getStageWorkflow(position, experienceLevel);
    
    // Get stage names - map directly from the IDs we already have in order
    const stageIds = stageData.map(d => d.stage_id);
    const { data: allStages } = await supabase
      .from('stages')
      .select('id, name');
    
    // Build ordered stage name array
    const orderedStages: string[] = [];
    for (const stage of stageData) {
      const stageName = allStages?.find(s => s.id === stage.stage_id)?.name;
      if (stageName) orderedStages.push(stageName);
    }
    
    return orderedStages.length > 0 ? orderedStages : getStageWorkflow(position, experienceLevel);
  } catch {
    return getStageWorkflow(position, experienceLevel);
  }
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
  
  return ['Initial Screening', 'Final Interview'];
}

export async function getDashboardSummary(
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> {
  const supabase = await createClient();

  // Query all applicants
  let query = supabase
    .from('applicants')
    .select('application_status, current_stage, position_applied, gender, birthdate, experience_level');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59');
  }

  const { data: rows, error } = await query;

  if (error || !rows) {
    return {
      total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0,
      byPosition: {}, byGender: {}, byAgeBand: {},
      dealer: emptyPositionSummary(), pitSupervisor: emptyPositionSummary(),
      pitManager: emptyPositionSummary(), operationsManager: emptyPositionSummary(),
      mathExam: emptyStageSummary(), tableTest: emptyStageSummary(),
      genderByPosition: emptyGenderByPosition(),
      age20s: 0, age30s: 0, age40s: 0, age50Plus: 0,
    };
  }

  const summary: DashboardSummary = {
    total: rows.length,
    pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0,
    byPosition: {},
    byGender: { Male: 0, Female: 0 },
    byAgeBand: {},
    dealer: emptyPositionSummary(),
    pitSupervisor: emptyPositionSummary(),
    pitManager: emptyPositionSummary(),
    operationsManager: emptyPositionSummary(),
    mathExam: emptyStageSummary(),
    tableTest: emptyStageSummary(),
    genderByPosition: emptyGenderByPosition(),
    age20s: 0, age30s: 0, age40s: 0, age50Plus: 0,
  };

  // Query stage results for math/table test stats
  const { data: stageRows } = await supabase
    .from('stage_results')
    .select('reference_no, stage_name, result_status');
  const stageMap: Record<string, Record<string, string>> = {};
  stageRows?.forEach((s) => {
    if (!stageMap[s.reference_no]) stageMap[s.reference_no] = {};
    stageMap[s.reference_no][s.stage_name] = s.result_status || '';
  });

  rows.forEach((row) => {
    const status = row.application_status || 'Pending';
    const pos = row.position_applied || 'Unknown';
    const exp = row.experience_level || 'Non-Experienced';
    const gender = row.gender || 'Unknown';
    const age = computeAge(row.birthdate);

    // Count status
    if (status === 'Pending') summary.pending++;
    else if (status === 'Ongoing') summary.ongoing++;
    else if (status === 'Passed' || status === 'Completed') summary.qualified++;
    else if (status === 'Reprofile') summary.reprofile++;
    else if (status === 'For Pooling') summary.pooling++;
    else if (status === 'Failed' || status === 'Not Recommended') summary.failed++;

    // byPosition
    summary.byPosition[pos] = (summary.byPosition[pos] || 0) + 1;

    // byGender
    if (gender === 'Male' || gender === 'Female') {
      summary.byGender[gender] = (summary.byGender[gender] || 0) + 1;
    }

    // byAgeBand (standard)
    const band = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : '45+';
    summary.byAgeBand[band] = (summary.byAgeBand[band] || 0) + 1;

    // New age bands (20s, 30s, 40s, 50+)
    if (age >= 20 && age < 30) summary.age20s++;
    else if (age >= 30 && age < 40) summary.age30s++;
    else if (age >= 40 && age < 50) summary.age40s++;
    else if (age >= 50) summary.age50Plus++;

    // Position breakdowns
    let posSummary: PositionSummary;
    if (pos === 'Dealer') posSummary = summary.dealer;
    else if (pos === 'Pit Supervisor') posSummary = summary.pitSupervisor;
    else if (pos === 'Pit Manager') posSummary = summary.pitManager;
    else if (pos === 'Operations Manager') posSummary = summary.operationsManager;
    else return;

    posSummary.total++;
    if (status === 'Pending') posSummary.pending++;
    else if (status === 'Ongoing') posSummary.ongoing++;
    else if (status === 'Passed' || status === 'Completed') posSummary.qualified++;
    else if (status === 'Reprofile') posSummary.reprofile++;
    else if (status === 'For Pooling') posSummary.pooling++;
    else if (status === 'Failed' || status === 'Not Recommended') posSummary.failed++;

    // Gender by position
    if (pos === 'Dealer') {
      if (exp === 'Experienced Dealer') {
        if (gender === 'Male') summary.genderByPosition.dealerExpMale++;
        else if (gender === 'Female') summary.genderByPosition.dealerExpFemale++;
      } else {
        if (gender === 'Male') summary.genderByPosition.dealerNonExpMale++;
        else if (gender === 'Female') summary.genderByPosition.dealerNonExpFemale++;
      }
    } else if (pos === 'Pit Supervisor') {
      if (gender === 'Male') summary.genderByPosition.pitSupervisorMale++;
      else if (gender === 'Female') summary.genderByPosition.pitSupervisorFemale++;
    } else if (pos === 'Pit Manager') {
      if (gender === 'Male') summary.genderByPosition.pitManagerMale++;
      else if (gender === 'Female') summary.genderByPosition.pitManagerFemale++;
    } else if (pos === 'Operations Manager') {
      if (gender === 'Male') summary.genderByPosition.operationsManagerMale++;
      else if (gender === 'Female') summary.genderByPosition.operationsManagerFemale++;
    }
  });

  // Compute math exam and table test stats from stage results
  const applicantsWithStages = new Set(Object.keys(stageMap));
  applicantsWithStages.forEach((refNo) => {
    const stages = stageMap[refNo];
    const mathResult = stages['Math Exam'];
    const tableResult = stages['Table Test'];

    if (mathResult) {
      summary.mathExam.taken++;
      if (mathResult === 'Passed') summary.mathExam.passed++;
      else if (mathResult === 'Failed') summary.mathExam.failed++;
      else summary.mathExam.pending++;
    }
    if (tableResult) {
      summary.tableTest.taken++;
      if (tableResult === 'Passed') summary.tableTest.passed++;
      else if (tableResult === 'Failed') summary.tableTest.failed++;
      else summary.tableTest.pending++;
    }
  });

  // For applicants who haven't taken these stages yet, count as pending
  const dealerApplicants = rows.filter(r => r.position_applied === 'Dealer').length;
  summary.mathExam.pending = Math.max(0, dealerApplicants - summary.mathExam.taken);
  summary.tableTest.pending = Math.max(0, dealerApplicants - summary.tableTest.taken);

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

  const workflow = await getStageWorkflowFromDB(applicant.position_applied, applicant.experience_level);
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

export async function getApplicantsPageData(options?: {
  limit?: number;
  allowedDepartments?: string[];
  isSuperAdmin?: boolean;
}): Promise<ApplicantListItem[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 300;
  const allowedDepartments = options?.allowedDepartments ?? [];
  const isSuperAdmin = options?.isSuperAdmin ?? false;

  if (!isSuperAdmin && allowedDepartments.length === 0) {
    return [];
  }

  let applicantsQuery = supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!isSuperAdmin) {
    applicantsQuery = applicantsQuery.in('department', allowedDepartments);
  }

  const { data: applicants, error } = await applicantsQuery;

  if (error || !applicants?.length) {
    return [];
  }

  const referenceNumbers = applicants.map((app) => app.reference_no).filter(Boolean);
  const { data: stages } = referenceNumbers.length > 0
    ? await supabase
        .from('stage_results')
        .select('reference_no, stage_name, stage_sequence, result_status, current_stage_label, remarks')
        .in('reference_no', referenceNumbers)
    : { data: [] as ApplicantStageSummary[] };

  const stageMap: Record<string, ApplicantStageSummary[]> = {};
  stages?.forEach((stage) => {
    if (!stageMap[stage.reference_no]) {
      stageMap[stage.reference_no] = [];
    }
    stageMap[stage.reference_no].push(stage as ApplicantStageSummary);
  });

  return applicants.map((applicant) => {
    const applicantStages = stageMap[applicant.reference_no] || [];
    const getStageResult = (stageName: string) => {
      const stage = applicantStages.find((item) => item.stage_name === stageName);
      return stage?.result_status || '-';
    };

    return {
      ...(applicant as Applicant),
      displayName: `${applicant.first_name} ${applicant.last_name}`,
      initialScreeningResult: getStageResult('Initial Screening'),
      mathExamResult: getStageResult('Math Exam'),
      tableTestResult: getStageResult('Table Test'),
      sweatyPalmResult: applicantStages.find((item) => item.stage_name === 'Final Interview')?.sweaty_palm_result || '-',
      finalInterviewResult: getStageResult('Final Interview'),
      remarks: applicant.remarks,
      stages: applicantStages,
    };
  });
}

export async function getAdminPasswordConfig(adminKey: string): Promise<{ column_visibility: string[] | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('config')
    .select('column_visibility')
    .eq('key', adminKey)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching admin config:', error);
    return null;
  }
  
  return data;
}
