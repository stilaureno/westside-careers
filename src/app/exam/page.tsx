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
  if (error === 'alreadyTaken') {
    return 'You have already taken this exam.';
  }
  return error;
}

export default function ExamPage() {
  const [view, setView] = useState<'start' | 'exam' | 'result'>('start');
  const [refInput, setRefInput] = useState('');
  const [applicant, setApplicant] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const [remaining, setRemaining] = useState(EXAM_DURATION_MINUTES * 60);
  const [startedAt, setStartedAt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (saveRef.current) clearInterval(saveRef.current);
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

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
  }, [view, stopTimers]);

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

      setApplicant(data);
      await startExam(data.referenceNo);
    } catch (err) {
      setMessage({ text: 'An unexpected error occurred.', type: 'error' });
      setLoading(false);
    }
  }

  async function startExam(referenceNo: string) {
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
  }

  async function forceFinish(reason: string) {
    stopTimers();
    const currentAnswers = answersRef.current;
    const res = await fetch(`/api/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', referenceNo: refInput, answers: currentAnswers, reason }),
    });
    const data = await res.json();
    if (data.success) {
      setResult(data.data);
    }
    setView('result');
  }

  function handleAnswer(questionNo: string, choiceKey: string) {
    setAnswers((prev) => ({ ...prev, [questionNo]: choiceKey }));
  }

  async function submitExam() {
    // Check for unanswered questions
    const unanswered = questions.find(q => !answers[q.question_no.toString()]);
    if (unanswered) {
      const confirmed = window.confirm(`You still have ${questions.length - Object.keys(answers).length} unanswered questions. Are you sure you want to submit?`);
      if (!confirmed) {
        const el = document.getElementById(`question-${unanswered.question_no}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.boxShadow = '0 0 0 3px #8b1e2d';
          setTimeout(() => { el.style.boxShadow = '0 10px 30px rgba(15,23,42,.06)'; }, 2000);
        }
        return;
      }
    }

    stopTimers();
    const currentAnswers = answersRef.current;
    const res = await fetch(`/api/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', referenceNo: refInput, answers: currentAnswers, reason: 'SUBMIT' }),
    });
    const data = await res.json();
    if (data.success) {
      setResult(data.data);
    }
    setView('result');
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
          <button onClick={submitExam} style={{
            width: '100%', padding: '16px', background: '#8b1e2d', color: '#fff',
            border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700',
            cursor: 'pointer',
          }}>
            Submit Exam
          </button>
        </div>
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
