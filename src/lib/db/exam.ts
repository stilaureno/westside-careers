import { createClient } from '@/lib/supabase/server';
import type { QuestionnaireQuestion } from '@/types';
import { PASSING_SCORE, MAX_MATH_EXAM_SCORE, EXAM_DURATION_MINUTES } from '@/types';

const QUESTIONNAIRE_CACHE_KEY = 'questionnaire_grouped_v2';
const cache = new Map<string, { data: string[]; expires: number }>();

function getCachedSets(): string[] | null {
  const entry = cache.get(QUESTIONNAIRE_CACHE_KEY);
  if (entry && Date.now() < entry.expires) {
    return entry.data;
  }
  return null;
}

function setCachedSets(sets: string[]): void {
  cache.set(QUESTIONNAIRE_CACHE_KEY, { data: sets, expires: Date.now() + 300 * 1000 });
}

export async function getQuestionnaireSets(): Promise<string[]> {
  const cached = getCachedSets();
  if (cached) return cached;

  const supabase = await createClient();
  const { data } = await supabase
    .from('questionnaire')
    .select('set_name');

  const sets = [...new Set((data || []).map((q: { set_name: string }) => q.set_name))];
  setCachedSets(sets);
  return sets;
}

export async function getQuestionsBySet(setName: string): Promise<QuestionnaireQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questionnaire')
    .select('*')
    .eq('set_name', setName)
    .order('question_no', { ascending: true });

  return (data || []) as QuestionnaireQuestion[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function shuffleQuestions(questions: QuestionnaireQuestion[]): QuestionnaireQuestion[] {
  return shuffleArray(questions);
}

export function shuffleChoices(question: QuestionnaireQuestion): QuestionnaireQuestion & { choices: { key: string; text: string }[]; correctChoiceKey: string } {
  const choices = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ];
  const shuffledChoices = shuffleArray(choices);
  const correctChoiceKey = shuffledChoices.find(
    (c) => c.text === question.correct_answer
  )?.key || 'A';

  return {
    ...question,
    choices: shuffledChoices,
    correctChoiceKey,
  };
}

export function sanitizeQuestionsForClient(questions: (QuestionnaireQuestion & { choices: { key: string; text: string }[]; correctChoiceKey: string })[]) {
  return questions.map((q) => ({
    id: q.id,
    question_no: q.question_no,
    question: q.question,
    choices: q.choices,
  }));
}

type ExamApplicantInfo =
  | {
      error: string;
    }
  | {
      referenceNo: string;
      lastName: string;
      firstName: string;
      middleName: string | null;
      alreadyTaken: boolean;
      previousResult: any;
    };

export async function getExamInfo(referenceNo: string): Promise<ExamApplicantInfo> {
  const supabase = await createClient();

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select('reference_no, last_name, first_name, middle_name, position_applied, application_status')
    .eq('reference_no', referenceNo)
    .single();

  if (error || !applicant) {
    return { error: 'Applicant not found' };
  }

  if (applicant.position_applied !== 'Dealer') {
    return { error: 'Math exam is only available for Dealer applicants' };
  }

  if (applicant.application_status === 'Completed' || applicant.application_status === 'Not Recommended') {
    return { error: 'notEligible' };
  }

  const { data: screeningResult } = await supabase
    .from('stage_results')
    .select('id')
    .eq('reference_no', referenceNo)
    .eq('stage_name', 'Initial Screening')
    .single();

  if (!screeningResult) {
    return { error: 'initialScreeningRequired' };
  }

  const { data: attempt } = await supabase
    .from('math_exam_results')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  return {
    referenceNo: applicant.reference_no,
    lastName: applicant.last_name,
    firstName: applicant.first_name,
    middleName: applicant.middle_name,
    alreadyTaken: !!attempt && attempt.attempt_status !== 'IN_PROGRESS',
    previousResult: attempt,
  };
}

export async function startExam(referenceNo: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const eligibility = await getExamInfo(referenceNo);
  if ('error' in eligibility) {
    return { success: false, error: eligibility.error };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('math_exam_results')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  if (existing && existing.attempt_status !== 'IN_PROGRESS') {
    return { success: false, error: 'alreadyTaken', data: existing };
  }

  const sets = await getQuestionnaireSets();
  const assignedSet = sets[Math.floor(Math.random() * sets.length)];
  const allQuestions = await getQuestionsBySet(assignedSet);
  const shuffledQ = shuffleQuestions(allQuestions);
  const questionsWithShuffledChoices = shuffledQ.map(shuffleChoices);
  const sanitized = sanitizeQuestionsForClient(questionsWithShuffledChoices);

  if (existing) {
    await supabase
      .from('math_exam_results')
      .update({
        assigned_set: assignedSet,
        started_at: new Date().toISOString(),
        submitted_at: null,
        attempt_status: 'IN_PROGRESS',
        answers_json: {},
        questions_json: questionsWithShuffledChoices,
        last_heartbeat: new Date().toISOString(),
        status: null,
        score: null,
        termination_reason: null,
      })
      .eq('reference_no', referenceNo);
  } else {
    await supabase
      .from('math_exam_results')
      .insert({
        reference_no: referenceNo,
        assigned_set: assignedSet,
        started_at: new Date().toISOString(),
        attempt_status: 'IN_PROGRESS',
        answers_json: {},
        questions_json: questionsWithShuffledChoices,
        time_limit_minutes: EXAM_DURATION_MINUTES,
        last_heartbeat: new Date().toISOString(),
      });
  }

  return {
    success: true,
    data: {
      questions: sanitized,
      duration: EXAM_DURATION_MINUTES * 60,
      startedAt: new Date().toISOString(),
    },
  };
}

export async function saveExamProgress(referenceNo: string, answers: Record<string, string>): Promise<{ success: boolean }> {
  const supabase = await createClient();
  await supabase
    .from('math_exam_results')
    .update({
      answers_json: answers,
      last_heartbeat: new Date().toISOString(),
    })
    .eq('reference_no', referenceNo)
    .eq('attempt_status', 'IN_PROGRESS');
  return { success: true };
}

export async function heartbeat(referenceNo: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  await supabase
    .from('math_exam_results')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('reference_no', referenceNo)
    .eq('attempt_status', 'IN_PROGRESS');
  return { success: true };
}

export async function submitExam(
  referenceNo: string,
  answers: Record<string, string>,
  reason: string = 'SUBMIT'
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from('math_exam_results')
    .select('questions_json, answers_json, attempt_status, score, status, termination_reason')
    .eq('reference_no', referenceNo)
    .single();

  if (!attempt) return { success: false, error: 'Exam not found' };

  if (attempt.attempt_status !== 'IN_PROGRESS') {
    return {
      success: true,
      data: {
        score: attempt.score,
        passingScore: PASSING_SCORE,
        maxScore: MAX_MATH_EXAM_SCORE,
        passed: attempt.status === 'Passed',
        terminationReason: attempt.termination_reason,
        previousResult: true
      }
    };
  }

  const questions = attempt.questions_json as (QuestionnaireQuestion & { choices: { key: string; text: string }[]; correctChoiceKey: string })[];
  const submittedAnswers = { ...(attempt.answers_json || {}), ...answers };
  let score = 0;

  questions.forEach((q) => {
    const chosen = submittedAnswers[q.question_no?.toString() || ''];
    if (chosen && chosen.toUpperCase() === q.correctChoiceKey?.toUpperCase()) {
      score++;
    }
  });

  const passed = score >= PASSING_SCORE;

  await supabase
    .from('math_exam_results')
    .update({
      answers_json: submittedAnswers,
      score,
      status: passed ? 'Passed' : 'Failed',
      attempt_status: reason === 'AUTO_SUBMIT' ? 'AUTO_SUBMITTED' : 'SUBMITTED',
      termination_reason: reason,
      submitted_at: new Date().toISOString(),
    })
    .eq('reference_no', referenceNo);

  await syncMathExamStage(referenceNo, score, passed);

  return {
    success: true,
    data: { score, passingScore: PASSING_SCORE, maxScore: MAX_MATH_EXAM_SCORE, passed, terminationReason: reason },
  };
}

async function syncMathExamStage(referenceNo: string, score: number, passed: boolean) {
  const supabase = await createClient();

  const { applicant_id } = await supabase
    .from('applicants')
    .select('applicant_id')
    .eq('reference_no', referenceNo)
    .single() as any || {};

  if (!applicant_id) return;

  const { data: existing } = await supabase
    .from('stage_results')
    .select('id')
    .eq('reference_no', referenceNo)
    .eq('stage_name', 'Math Exam')
    .single();

  const remarks = `Math Exam submitted via Applicant Portal. | Attempt Status: ${passed ? 'SUBMITTED' : 'AUTO_SUBMITTED'} | Reason: Submitted by applicant`;

  if (existing) {
    await supabase
      .from('stage_results')
      .update({
        result_status: passed ? 'Passed' : 'Failed',
        score,
        passing_score: PASSING_SCORE,
        max_score: MAX_MATH_EXAM_SCORE,
        remarks,
        evaluated_by: 'HR',
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('stage_results')
      .insert({
        applicant_id,
        reference_no: referenceNo,
        stage_name: 'Math Exam',
        stage_sequence: 2,
        result_status: passed ? 'Passed' : 'Failed',
        current_stage_label: passed ? 'Table Test' : 'Final Interview',
        score,
        passing_score: PASSING_SCORE,
        max_score: MAX_MATH_EXAM_SCORE,
        remarks,
        evaluated_by: 'HR',
        evaluated_at: new Date().toISOString(),
      });
  }

  const nextStage = passed ? 'Table Test' : 'Final Interview';
  const applicationStatus = passed ? 'Ongoing' : 'Failed';

  await supabase
    .from('applicants')
    .update({
      current_stage: 'Math Exam',
      application_status: applicationStatus,
      overall_result: passed ? 'Passed' : 'Failed',
      updated_at: new Date().toISOString(),
    })
    .eq('reference_no', referenceNo);

  await supabase
    .from('applicant_notifications')
    .insert({
      applicant_id,
      reference_no: referenceNo,
      stage_name: 'Math Exam',
      result_status: passed ? 'Passed' : 'Failed',
      notification_message: passed
        ? 'Congratulations! Please proceed to the next stage.'
        : 'Unfortunately, you did not pass the Math Exam.',
      visible_to_applicant: 'Yes',
      created_by: 'HR',
    });
}
