import { startExam, saveExamProgress, heartbeat, submitExam } from '@/lib/db/exam';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, referenceNo, answers, reason } = body;

    if (!referenceNo) {
      return NextResponse.json({ error: 'Missing referenceNo' }, { status: 400 });
    }

    switch (action) {
      case 'getInfo':
        return NextResponse.json(await getExamInfo(referenceNo));
      case 'start':
        return NextResponse.json(await startExam(referenceNo));
      case 'saveProgress':
        return NextResponse.json(await saveExamProgress(referenceNo, answers || {}));
      case 'heartbeat':
        return NextResponse.json(await heartbeat(referenceNo));
      case 'submit':
        return NextResponse.json(await submitExam(referenceNo, answers || {}, reason || 'SUBMIT'));
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getExamInfo(referenceNo: string) {
  const supabase = await createClient();

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select('reference_no, last_name, first_name, middle_name, position_applied, application_status, current_stage')
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