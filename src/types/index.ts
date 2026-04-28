export const EXPERIENCE_LEVELS = ['Non-Experienced Dealer', 'Experienced Dealer'] as const;
export const ALLOWED_GAMES = ['MB', 'BJ', 'RL', 'CRAPS'] as const;
export const FINAL_INTERVIEW_RESULTS = ['Passed', 'Reprofile', 'For Pooling', 'Not Recommended'] as const;
export const EXAM_DURATION_MINUTES = 10;
export const PASSING_SCORE = 8;
export const MAX_MATH_EXAM_SCORE = 10;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];
export type GameCode = typeof ALLOWED_GAMES[number];
export type FinalInterviewResult = typeof FINAL_INTERVIEW_RESULTS[number];

export type ApplicationStatus = 'Pending' | 'Ongoing' | 'Completed' | 'Not Recommended' | 'Passed' | 'Failed' | 'Reprofile' | 'For Pooling';
export type ResultStatus = 'Passed' | 'Failed' | 'In Progress';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';

export interface Applicant {
  id?: string;
  applicant_id: string;
  reference_no: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  birthdate: string;
  age?: number;
  gender: string;
  contact_number: string;
  email_address?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi_value?: number;
  position_applied: string;
  experience_level?: string;
  current_company_name?: string;
  current_position?: string;
  previous_company_name?: string;
  department?: string;
  preferred_department?: string;
  currently_employed: string;
  duplicate_key?: string;
  current_stage?: string;
  application_status?: string;
  overall_result?: string;
  exam_authorized?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApplicantGame {
  id?: string;
  applicant_id: string;
  reference_no: string;
  game_code: string;
}

export interface StageResult {
  id?: string;
  applicant_id: string;
  reference_no: string;
  stage_name: string;
  stage_sequence: number;
  result_status?: string;
  current_stage_label?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi_value?: number;
  bmi_result?: string;
  color_blind_result?: string;
  visible_tattoo?: string;
  invisible_tattoo?: string;
  sweaty_palm_result?: string;
  score?: number;
  passing_score?: number;
  max_score?: number;
  remarks?: string;
  evaluated_by?: string;
  evaluated_at?: string;
  created_at?: string;
}

export interface Notification {
  id?: string;
  applicant_id: string;
  reference_no: string;
  stage_name?: string;
  result_status?: string;
  notification_message?: string;
  visible_to_applicant?: string;
  created_at?: string;
  created_by?: string;
}

export interface QuestionnaireQuestion {
  id?: string;
  set_name: string;
  question_no: number;
  questionNo?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

export interface MathExamResult {
  id?: string;
  reference_no: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  score?: number;
  status?: string;
  assigned_set?: string;
  started_at?: string;
  submitted_at?: string;
  attempt_status?: AttemptStatus;
  answers_json?: Record<string, string>;
  questions_json?: QuestionnaireQuestion[];
  time_limit_minutes?: number;
  termination_reason?: string;
  last_heartbeat?: string;
  created_at?: string;
}

export interface ConfigEntry {
  key: string;
  value: string;
}

export interface StageRoadmapItem {
  stageName: string;
  sequence: number;
  status: 'completed' | 'current' | 'pending';
  result?: string;
  label?: string;
}

export interface ApplicationFormData {
  lastName: string;
  firstName: string;
  middleName?: string;
  birthdate: string;
  gender: string;
  contactNumber: string;
  emailAddress?: string;
  heightCm?: number;
  weightKg?: number;
  department: string;
  positionApplied: string;
  experienceLevel?: string;
  games?: string[];
  currentlyEmployed: string;
  currentCompanyName?: string;
  currentPosition?: string;
  previousCompanyName?: string;
  preferredDepartment?: string;
}

export interface DashboardSummary {
  total: number;
  pending: number;
  ongoing: number;
  qualified: number;
  reprofile: number;
  pooling: number;
  failed: number;
  byPosition: Record<string, number>;
  byGender: Record<string, number>;
  byAgeBand: Record<string, number>;
  // Position breakdowns
  dealer: PositionSummary;
  pitSupervisor: PositionSummary;
  pitManager: PositionSummary;
  operationsManager: PositionSummary;
  // Stage-specific stats
  mathExam: StageSummary;
  tableTest: StageSummary;
  // Gender by position
  genderByPosition: GenderByPosition;
  // Age bands
  age20s: number;
  age30s: number;
  age40s: number;
  age50Plus: number;
}

export interface PositionSummary {
  total: number;
  pending: number;
  ongoing: number;
  qualified: number;
  reprofile: number;
  pooling: number;
  failed: number;
}

export interface StageSummary {
  taken: number;
  pending: number;
  passed: number;
  failed: number;
}

export interface GenderByPosition {
  dealerNonExpMale: number;
  dealerNonExpFemale: number;
  dealerExpMale: number;
  dealerExpFemale: number;
  pitSupervisorMale: number;
  pitSupervisorFemale: number;
  pitManagerMale: number;
  pitManagerFemale: number;
  operationsManagerMale: number;
  operationsManagerFemale: number;
}
