'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PASSING_SCORE, MAX_MATH_EXAM_SCORE, EXAM_DURATION_MINUTES } from '@/types';

type Choice = { key: string; text: string };
type Question = { id: string; question_no: number; question: string; choices: Choice[] };

function getExamErrorMessage(error: string): string {
  if (error === 'notEligible') {
    return 'You are not eligible for the math exam at this time.';
  }
  if (error === 'initialScreeningRequired') {
    return 'You must complete Initial Screening before taking the math exam.';
  }
  if (error === 'examNotAuthorized') {
    return 'You are not authorized to take the exam. Please contact HR.';
  }
  if (error === 'alreadyTaken') {
    return 'You have already taken this exam.';
  }
  return error;
}

export default function ExamPage() {
  const [view, setView] = useState<'start' | 'exam' | 'result'>('start');
  const [refInput, setRefInput] = useState('');
  const [applicant, setApplicant] = useState<{ referenceNo: string; lastName: string; firstName: string; middleName?: string | null } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const activeReferenceRef = useRef('');
  const [remaining, setRemaining] = useState(EXAM_DURATION_MINUTES * 60);
  const [startedAt, setStartedAt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [pendingUnanswered, setPendingUnanswered] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  const finishInProgressRef = useRef(false);

  const stopTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (saveRef.current) clearInterval(saveRef.current);
  }, []);

  useEffect(() => {
    const savedRef = localStorage.getItem('examRef');
    if (savedRef) {
      setRefInput(savedRef);
      localStorage.removeItem('examRef');
    }
  }, []);

  useEffect(() => {
    activeReferenceRef.current = applicant?.referenceNo || refInput.trim();
  }, [applicant, refInput]);

  async function verifyAndStart() {
    if (!refInput.trim()) {
      setMessage({ text: 'Please enter your reference number.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getInfo', referenceNo: refInput.trim() }),
      });

      if (!res.ok) {
        setMessage({ text: 'Failed to verify reference number.', type: 'error' });
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.error) {
        setMessage({ text: getExamErrorMessage(data.error), type: 'error' });
        setLoading(false);
        return;
      }

      if (data.alreadyTaken) {
        setResult({
          score: data.previousResult?.score,
          passed: data.previousResult?.status === 'Passed',
          terminationReason: data.previousResult?.termination_reason || 'Previously taken',
          previousResult: true,
        });
        setView('result');
        setLoading(false);
        return;
      }

      setApplicant({
        referenceNo: data.referenceNo,
        lastName: data.lastName,
        firstName: data.firstName,
        middleName: data.middleName,
      });
      setRefInput(data.referenceNo);
      await startExam(data.referenceNo);
    } catch (err) {
      setMessage({ text: 'An unexpected error occurred.', type: 'error' });
      setLoading(false);
    }
  }

  async function startExam(referenceNo: string) {
    try {
      const res = await fetch(`/api/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', referenceNo }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === 'alreadyTaken' && data.data) {
          setResult({
            score: data.data.score,
            passed: data.data.status === 'Passed',
            terminationReason: data.data.termination_reason || 'Previously taken',
            previousResult: true,
          });
          setView('result');
          return;
        }
        setMessage({ text: getExamErrorMessage(data.error || 'Failed to start exam.'), type: 'error' });
        return;
      }

      setQuestions(data.data.questions);
      setStartedAt(data.data.startedAt);
      setRemaining(data.data.duration);
      setAnswers({});
      answersRef.current = {};
      setMessage(null);
      setView('exam');

      timerRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            stopTimers();
            forceFinish('TIME_LIMIT_REACHED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      heartbeatRef.current = setInterval(async () => {
        await fetch(`/api/exam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat', referenceNo }),
        });
      }, 15000);

      saveRef.current = setInterval(async () => {
        await fetch(`/api/exam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveProgress', referenceNo, answers: answersRef.current }),
        });
      }, 15000);
    } finally {
      setLoading(false);
    }
  }

  const forceFinish = useCallback(async (reason: string) => {
    if (finishInProgressRef.current) return;
    finishInProgressRef.current = true;
    stopTimers();
    const currentAnswers = answersRef.current;
    const referenceNo = activeReferenceRef.current;

    try {
      const res = await fetch(`/api/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', referenceNo, answers: currentAnswers, reason }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setMessage(null);
        setView('result');
        return;
      }

      setMessage({ text: getExamErrorMessage(data.error || 'Failed to submit exam.'), type: 'error' });
      setSubmitting(false);
    } catch (err) {
      setMessage({ text: 'Failed to submit exam. Please try again.', type: 'error' });
      setSubmitting(false);
    } finally {
      finishInProgressRef.current = false;
    }
  }, [stopTimers]);

  useEffect(() => {
    if (view !== 'exam') return;

    const handleVisibility = () => {
      if (document.hidden) {
        forceFinish('TAB_HIDDEN_OR_MINIMIZED');
      }
    };
    const handleBlur = () => forceFinish('WINDOW_LOST_FOCUS');

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      stopTimers();
    };
  }, [forceFinish, stopTimers, view]);

  function handleAnswer(questionNo: string, choiceKey: string) {
    const nextAnswers = { ...answersRef.current, [questionNo]: choiceKey };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  }

  async function completeSubmit() {
    if (submitting || finishInProgressRef.current) return;
    setSubmitting(true);
    setConfirmSubmitOpen(false);
    const currentAnswers = answersRef.current;

    finishInProgressRef.current = true;
    stopTimers();
    const referenceNo = activeReferenceRef.current;

    try {
      const res = await fetch(`/api/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', referenceNo, answers: currentAnswers, reason: 'SUBMIT' }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setMessage(null);
        setView('result');
        return;
      }

      setMessage({ text: getExamErrorMessage(data.error || 'Failed to submit exam.'), type: 'error' });
      setSubmitting(false);
    } catch (err) {
      setMessage({ text: 'Failed to submit exam. Please try again.', type: 'error' });
      setSubmitting(false);
    } finally {
      finishInProgressRef.current = false;
    }
  }

  function submitExam() {
    if (submitting || finishInProgressRef.current) return;

    const currentAnswers = answersRef.current;
    const unanswered = questions.find(q => !currentAnswers[q.question_no.toString()]);

    if (unanswered) {
      setPendingUnanswered(questions.length - Object.keys(currentAnswers).length);
      setConfirmSubmitOpen(true);
      const el = document.getElementById(`question-${unanswered.question_no}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 0 3px #8b1e2d';
        setTimeout(() => { el.style.boxShadow = '0 10px 30px rgba(15,23,42,.06)'; }, 2000);
      }
      return;
    }

    void completeSubmit();
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  if (view === 'result') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f6f8fc', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}>
        <div style={{
          background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '480px',
          width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(15,23,42,.06)',
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Your Score</p>
          <p style={{ fontSize: '72px', fontWeight: '800', color: result?.passed ? '#166534' : '#991b1b', lineHeight: 1, marginBottom: '8px' }}>
            {result?.score ?? 0}
            <span style={{ fontSize: '28px', color: '#9ca3af' }}>/{MAX_MATH_EXAM_SCORE}</span>
          </p>
          <p style={{
            fontSize: '20px', fontWeight: '700', marginBottom: '24px',
            color: result?.passed ? '#166534' : '#991b1b',
          }}>
            {result?.passed ? 'PASSED' : 'FAILED'}
          </p>
          {result?.previousResult && (
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
              You have already taken this exam.
            </p>
          )}
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
            Passing score: {PASSING_SCORE}/{MAX_MATH_EXAM_SCORE}
          </p>
          <Link href="/" style={{
            display: 'block', padding: '14px 24px', background: '#8b1e2d', color: '#fff',
            borderRadius: '12px', fontWeight: '700', textDecoration: 'none', fontSize: '15px',
          }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (view === 'exam') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f6f8fc', padding: '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          background: '#fff', borderRadius: '20px', padding: '20px 28px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '720px',
          boxShadow: '0 10px 30px rgba(15,23,42,.06)', position: 'sticky', top: '20px', zIndex: 10
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Time Remaining</p>
            <p style={{
              fontSize: '28px', fontWeight: '800', margin: 0,
              color: remaining <= 60 ? '#991b1b' : '#1f2937',
            }}>{formatTime(remaining)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Answered</p>
            <p style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#1f2937' }}>
              {Object.keys(answers).length}/{questions.length}
            </p>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {questions.map((q) => (
            <div key={q.question_no} id={`question-${q.question_no}`} style={{
              background: '#fff', borderRadius: '18px', padding: '20px 24px',
              boxShadow: '0 10px 30px rgba(15,23,42,.06)',
              transition: 'all 0.3s ease'
            }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#8b1e2d', marginBottom: '10px' }}>
                Question {q.question_no}
              </p>
              <p style={{ fontSize: '16px', color: '#1f2937', marginBottom: '16px', lineHeight: 1.5 }}>
                {q.question}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {q.choices.map((choice) => (
                  <button
                    key={choice.key}
                    type="button"
                    onClick={() => handleAnswer(q.question_no.toString(), choice.key)}
                    style={{
                      padding: '12px 16px', borderRadius: '12px', border: `2px solid ${answers[q.question_no.toString()] === choice.key ? '#8b1e2d' : '#e5e7eb'}`,
                      background: answers[q.question_no.toString()] === choice.key ? '#fbeaec' : '#fff',
                      color: answers[q.question_no.toString()] === choice.key ? '#8b1e2d' : '#1f2937',
                      fontWeight: answers[q.question_no.toString()] === choice.key ? '700' : '400',
                      cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                    }}
                  >
                    <span style={{ fontWeight: '700', marginRight: '8px' }}>{choice.key}.</span>
                    {choice.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: '720px', marginTop: '20px', paddingBottom: '40px' }}>
          <button onClick={submitExam} disabled={submitting} style={{
            width: '100%', padding: '16px', background: '#8b1e2d', color: '#fff',
            border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700',
            cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1,
          }}>
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>

        {confirmSubmitOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 50,
          }}>
            <div style={{
              width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '20px',
              padding: '24px', boxShadow: '0 18px 42px rgba(15,23,42,.18)',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937', margin: '0 0 10px' }}>
                Unanswered Items
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 20px' }}>
                You still have {pendingUnanswered} unanswered question{pendingUnanswered === 1 ? '' : 's'}. Do you want to submit anyway?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  style={{
                    minHeight: '48px', borderRadius: '12px', border: '1px solid #d1d5db',
                    background: '#fff', color: '#1f2937', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void completeSubmit()}
                  style={{
                    minHeight: '48px', borderRadius: '12px', border: 'none',
                    background: '#8b1e2d', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f6f8fc', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '460px',
        width: '100%', boxShadow: '0 10px 30px rgba(15,23,42,.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/WESTSIDE%20LOGO%20COLORED.png"
            alt="Westside Resort logo"
            style={{ width: '220px', maxWidth: '100%', margin: '0 auto 16px', display: 'block' }}
          />
          <h1 style={{ fontSize: '22px', color: '#8b1e2d', marginBottom: '6px' }}>Math Proficiency Exam</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {EXAM_DURATION_MINUTES} minutes &middot; {PASSING_SCORE}/{MAX_MATH_EXAM_SCORE} passing score
          </p>
        </div>

        {message && (
          <div style={{
            padding: '14px', borderRadius: '12px', marginBottom: '16px',
            background: message.type === 'success' ? '#ecfdf3' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
            color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px',
          }}>{message.text}</div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
            Reference Number *
          </label>
          <input
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder="APP-20260414093031"
            style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
          />
        </div>

        <button
          onClick={verifyAndStart}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', background: '#8b1e2d', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1, marginBottom: '12px',
          }}
        >
          {loading ? 'Verifying...' : 'Verify & Start Exam'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <Link href="/" style={{ color: '#6b7280', fontSize: '13px', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
