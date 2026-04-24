import { getExamInfo, startExam, saveExamProgress, heartbeat, submitExam } from '@/lib/db/exam';
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
