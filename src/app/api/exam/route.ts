import { getExamInfo, startExam, saveExamProgress, heartbeat, submitExam } from '@/lib/db/exam';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, referenceNo, lastName, birthdate, answers, reason } = body;

    // Support both old referenceNo and new lastName/birthdate auth
    if (!referenceNo && (!lastName || !birthdate)) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const ref = referenceNo || '';

    switch (action) {
      case 'getInfo':
        return NextResponse.json(await getExamInfo(lastName || ref, birthdate || undefined));
      case 'start':
        return NextResponse.json(await startExam(ref || lastName || ''));
      case 'saveProgress':
        return NextResponse.json(await saveExamProgress(ref || lastName || '', answers || {}));
      case 'heartbeat':
        return NextResponse.json(await heartbeat(ref || lastName || ''));
      case 'submit':
        return NextResponse.json(await submitExam(ref || lastName || '', answers || {}, reason || 'SUBMIT'));
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
