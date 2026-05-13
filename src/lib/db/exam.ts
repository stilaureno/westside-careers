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

// Improved shuffle choices to be more robust and user-friendly
export function shuffleChoices(question: QuestionnaireQuestion): QuestionnaireQuestion & { choices: { key: string; text: string }[]; correctChoiceKey: string } {
  // 1. Get all options as an array of texts
  const options = [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ];

  // 2. Shuffle the texts
  const shuffledTexts = shuffleArray(options);
  
  // 3. Map to A, B, C, D keys in order
  const choices = shuffledTexts.map((text, index) => ({
    key: String.fromCharCode(65 + index), // A, B, C, D
    text
  }));

  // 4. Find which key is correct
  // Normalize: trim, collapse whitespace, and remove commas for numbers
  const normalize = (s: string | number) => String(s || '').replace(/\s+/g, ' ').replace(/,/g, '').trim();
  const correctText = normalize(question.correct_answer);

  const correctChoice = choices.find(c => normalize(c.text) === correctText);
  const correctChoiceKey = correctChoice ? correctChoice.key : 'A'; // Default to A only if mismatch

  return {
    ...question,
    choices,
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
      examAuthorized: string;
    };

function getExamWriteErrorMessage(context: string, error: { message?: string } | null): string {
  return error?.message ? `${context}: ${error.message}` : context;
}

export async function getExamInfo(lastNameOrRef: string, birthdate?: string): Promise<ExamApplicantInfo> {
  const supabase = await createClient();

  // If birthdate is provided, search by lastname and birthdate. Otherwise, search by reference number.
  let applicant;
  let error;

  if (birthdate) {
    const result = await supabase
      .from('applicants')
      .select('reference_no, last_name, first_name, middle_name, birthdate, position_applied, application_status, exam_authorized')
      .ilike('last_name', lastNameOrRef)
      .eq('birthdate', birthdate)
      .single();
    applicant = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from('applicants')
      .select('reference_no, last_name, first_name, middle_name, position_applied, application_status, exam_authorized')
      .eq('reference_no', lastNameOrRef)
      .single();
    applicant = result.data;
    error = result.error;
  }

  if (error || !applicant) {
    return { error: 'Applicant not found' };
  }

  if (applicant.position_applied !== 'Dealer') {
    return { error: 'Math exam is only available for Dealer applicants' };
  }

  if (applicant.exam_authorized !== 'Yes') {
    return { error: 'examNotAuthorized' };
  }

  if (applicant.application_status === 'Completed' || applicant.application_status === 'Not Recommended') {
    return { error: 'notEligible' };
  }

  const referenceNo = applicant.reference_no;

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

  const hasSubmittedAttempt = !!attempt && attempt.attempt_status !== 'IN_PROGRESS';
  const needsRetake = hasSubmittedAttempt && attempt.status === 'Failed';

  return {
    referenceNo: applicant.reference_no,
    lastName: applicant.last_name,
    firstName: applicant.first_name,
    middleName: applicant.middle_name,
    alreadyTaken: hasSubmittedAttempt && !needsRetake,
    previousResult: attempt,
    examAuthorized: applicant.exam_authorized || 'No',
  };
}

export async function startExam(referenceNo: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const eligibility = await getExamInfo(referenceNo);
  if ('error' in eligibility) {
    return { success: false, error: eligibility.error };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from('math_exam_results')
    .select('*')
    .eq('reference_no', referenceNo)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    return { success: false, error: getExamWriteErrorMessage('Failed to load exam attempt', existingError) };
  }

  if (existing) {
    const currentAttemptCount = (existing as any).attempt_count || 1;

    // If an attempt is in progress, allow resume
    if (existing.attempt_status === 'IN_PROGRESS') {
      // resume
    } else {
      // Completed attempts
      if (existing.status === 'Passed' || existing.status === 'Completed') {
        return { success: false, error: 'alreadyTaken', data: existing };
      }
      // If failed and already retaken once, require pen & paper
      if (existing.status === 'Failed' && currentAttemptCount >= 2) {
        return { success: false, error: 'retakeLimitReached', data: existing };
      }
    }
  }

  const sets = await getQuestionnaireSets();
  const assignedSet = sets[Math.floor(Math.random() * sets.length)];
  const allQuestions = await getQuestionsBySet(assignedSet);
  const shuffledQ = shuffleQuestions(allQuestions);
  const questionsWithShuffledChoices = shuffledQ.map(shuffleChoices);
  const sanitized = sanitizeQuestionsForClient(questionsWithShuffledChoices);
  const startedAt = new Date().toISOString();

  if (existing) {
    const currentAttemptCount = (existing as any).attempt_count || 1;
    const isRetake = existing.attempt_status !== 'IN_PROGRESS';
    const { error: updateError } = await supabase
      .from('math_exam_results')
      .update({
        assigned_set: assignedSet,
        started_at: startedAt,
        submitted_at: null,
        attempt_status: 'IN_PROGRESS',
        answers_json: {},
        questions_json: questionsWithShuffledChoices,
        last_heartbeat: startedAt,
        status: null,
        score: null,
        termination_reason: null,
        attempt_count: isRetake ? currentAttemptCount + 1 : currentAttemptCount,
      })
      .eq('reference_no', referenceNo);

    if (updateError) {
      return { success: false, error: getExamWriteErrorMessage('Failed to reset exam attempt', updateError) };
    }
  } else {
    const { error: insertError } = await supabase
      .from('math_exam_results')
      .insert({
        reference_no: referenceNo,
        last_name: eligibility.lastName,
        first_name: eligibility.firstName,
        middle_name: eligibility.middleName,
        assigned_set: assignedSet,
        started_at: startedAt,
        attempt_status: 'IN_PROGRESS',
        answers_json: {},
        questions_json: questionsWithShuffledChoices,
        time_limit_minutes: EXAM_DURATION_MINUTES,
        last_heartbeat: startedAt,
      });

    if (insertError) {
      return { success: false, error: getExamWriteErrorMessage('Failed to create exam attempt', insertError) };
    }
  }

  return {
    success: true,
    data: {
      questions: sanitized,
      duration: EXAM_DURATION_MINUTES * 60,
      startedAt,
    },
  };
}

export async function saveExamProgress(referenceNo: string, answers: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('math_exam_results')
    .update({
      answers_json: answers,
      last_heartbeat: new Date().toISOString(),
    })
    .eq('reference_no', referenceNo)
    .eq('attempt_status', 'IN_PROGRESS');
  if (error) {
    return { success: false, error: getExamWriteErrorMessage('Failed to save exam progress', error) };
  }
  return { success: true };
}

export async function heartbeat(referenceNo: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('math_exam_results')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('reference_no', referenceNo)
    .eq('attempt_status', 'IN_PROGRESS');
  if (error) {
    return { success: false, error: getExamWriteErrorMessage('Failed to update exam heartbeat', error) };
  }
  return { success: true };
}

export async function submitExam(
  referenceNo: string,
  answers: Record<string, string>,
  reason: string = 'SUBMIT'
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();

  const { data: attempt, error: attemptError } = await supabase
    .from('math_exam_results')
    .select('questions_json, answers_json, attempt_status, score, status, termination_reason, attempt_count')
    .eq('reference_no', referenceNo)
    .single();

  if (attemptError && attemptError.code !== 'PGRST116') {
    return { success: false, error: getExamWriteErrorMessage('Failed to load exam attempt', attemptError) };
  }

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
  
  // Merge answers: prefer the final submission answers, then previous progress
  const submittedAnswers = { ...(attempt.answers_json || {}), ...answers };
  let score = 0;

  questions.forEach((q) => {
    const questionKey = q.question_no?.toString() || '';
    const chosen = submittedAnswers[questionKey];
    
    // Check if the chosen key matches the stored correct key for this specific shuffle
    if (chosen && chosen.toUpperCase() === q.correctChoiceKey?.toUpperCase()) {
      score++;
    }
  });

  const passed = score >= PASSING_SCORE;

  const { error: updateError } = await supabase
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

  if (updateError) {
    return { success: false, error: getExamWriteErrorMessage('Failed to submit exam', updateError) };
  }

  await syncMathExamStage(referenceNo, score, passed, reason, attempt?.attempt_count || 1);

  return {
    success: true,
    data: { score, passingScore: PASSING_SCORE, maxScore: MAX_MATH_EXAM_SCORE, passed, terminationReason: reason },
  };
}

async function syncMathExamStage(referenceNo: string, score: number, passed: boolean, reason: string = 'SUBMIT', attemptCount: number = 1) {
  const supabase = await createClient();

  const { data: applicant } = await supabase
    .from('applicants')
    .select('applicant_id, experience_level')
    .eq('reference_no', referenceNo)
    .single();

  if (!applicant?.applicant_id) return;
  const applicant_id = applicant.applicant_id;

  const { data: existing } = await supabase
    .from('stage_results')
    .select('id')
    .eq('reference_no', referenceNo)
    .eq('stage_name', 'Math Exam')
    .single();

  const isAutoSubmit = reason === 'AUTO_SUBMIT';
  const submissionType = isAutoSubmit ? 'Auto-submitted (lost focus/tab switch)' : 'Submitted via Applicant Portal';
  const remarks = `Math Exam ${submissionType} | Result: ${passed ? 'Passed' : 'Failed'} | Score: ${score}/${MAX_MATH_EXAM_SCORE}`;

  const nextStageLabel =
    applicant.experience_level === 'Experienced Dealer' || applicant.experience_level === 'Experienced-Dealer'
      ? 'Table Test'
      : 'Final Interview';

   if (existing) {
    await supabase
      .from('stage_results')
      .update({
        result_status: passed ? 'Passed' : 'Failed',
        current_stage_label: passed ? nextStageLabel : 'Math Exam Retake',
        score,
        passing_score: PASSING_SCORE,
        max_score: MAX_MATH_EXAM_SCORE,
        remarks,
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
        current_stage_label: passed ? nextStageLabel : 'Math Exam Retake',
        score,
        passing_score: PASSING_SCORE,
        max_score: MAX_MATH_EXAM_SCORE,
        remarks,
      });
  }

  // If passed -> mark applicant completed. If failed -> either schedule automatic retake (if attemptCount < 2) or schedule pen & paper
  if (passed) {
    const { error: appUpdateError } = await supabase
      .from('applicants')
      .update({ application_status: 'Completed', overall_result: 'Passed', current_stage: 'Math Exam', updated_at: new Date().toISOString() })
      .eq('reference_no', referenceNo);
    if (appUpdateError) console.error('Failed to update applicant after math exam', appUpdateError);
  } else {
    if (attemptCount < 2) {
      const { error: appUpdateError } = await supabase
        .from('applicants')
        .update({ application_status: 'Ongoing', overall_result: 'Retake', current_stage: 'Math Exam Retake', updated_at: new Date().toISOString() })
        .eq('reference_no', referenceNo);

      if (appUpdateError) console.error('Failed to update applicant after failed math exam', appUpdateError);

      const notification = {
        reference_no: referenceNo,
        stage_name: 'Math Exam Retake',
        notification_message: 'Applicant scheduled for Math Exam retake',
        created_at: new Date().toISOString(),
      };

      const { error: notifyError } = await supabase.from('applicant_notifications').insert(notification);
      if (notifyError) console.error('Failed to create notification for math exam retake', notifyError);
    } else {
      // schedule pen & paper (manual) retake
      try {
        const { data: existingPen, error: penErr } = await supabase
          .from('stage_results')
          .select('id')
          .eq('reference_no', referenceNo)
          .eq('stage_name', 'Pen & Paper Test')
          .single();

        if (penErr && penErr.code !== 'PGRST116') console.error('Failed to check pen & paper stage', penErr);

        if (!existingPen) {
          const penPayload: any = {
            applicant_id: applicant_id,
            reference_no: referenceNo,
            stage_name: 'Pen & Paper Test',
            stage_sequence: 99,
            result_status: null,
            score: null,
            passing_score: 30,
            max_score: 50,
            current_stage_label: 'Pen & Paper Test',
            remarks: 'Scheduled Pen & Paper retake',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const { error: insErr } = await supabase.from('stage_results').insert(penPayload);
          if (insErr) console.error('Failed to insert pen & paper stage', insErr);
        }

        const { error: appUpdateError } = await supabase
          .from('applicants')
          .update({ application_status: 'Ongoing', overall_result: 'Pen & Paper Pending', current_stage: 'Pen & Paper Test', updated_at: new Date().toISOString() })
          .eq('reference_no', referenceNo);

        if (appUpdateError) console.error('Failed to update applicant for pen & paper', appUpdateError);

        const notification = {
          reference_no: referenceNo,
          stage_name: 'Pen & Paper Test',
          notification_message: 'Applicant scheduled for Pen & Paper test (50 items). Passing score: 30. Admin will record the result.',
          created_at: new Date().toISOString(),
        };

        const { error: notifyError } = await supabase.from('applicant_notifications').insert(notification);
        if (notifyError) console.error('Failed to create notification for pen & paper', notifyError);
      } catch (err) {
        console.error('Error scheduling pen & paper', err);
      }
    }
  }
}
