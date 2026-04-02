import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type LimitRow = {
  subject: string;
  subjectKey: string;
  usedThisWeek: number;
  remainingThisWeek: number;
  maxPerWeek: number;
};

type QuizQuestion = {
  index: number;
  text: string;
  options: string[];
};

type BreakdownItem = {
  index: number;
  text: string;
  options: string[];
  yourIndex: number;
  correctIndex: number;
  isCorrect: boolean;
};

const MAX_PER_WEEK = 2;

const DEFAULT_LIMITS: LimitRow[] = ['Mathematics', 'Physics', 'Chemistry'].map((subject) => ({
  subject,
  subjectKey: subject.toLowerCase(),
  usedThisWeek: 0,
  remainingThisWeek: MAX_PER_WEEK,
  maxPerWeek: MAX_PER_WEEK,
}));

function formatApiError(e: unknown): string {
  const ex = e as {
    response?: { status?: number; data?: { message?: string; errors?: { msg: string }[] } };
    message?: string;
  };
  const d = ex.response?.data;
  if (d?.message && typeof d.message === 'string') return d.message;
  if (Array.isArray(d?.errors) && d.errors.length) {
    return d.errors.map((x) => x.msg || String(x)).join(' · ');
  }
  if (ex.response?.status === 404) {
    return (
      'Quiz API returned 404. Fix: (1) Restart backend from backend/: npm run dev or npm run dev:nodemon ' +
      '(2) If API runs on port 5001, set VITE_PROXY_TARGET=http://127.0.0.1:5001 in frontend/.env and restart Vite ' +
      '(3) Kill old process on 5000: fuser -k 5000/tcp'
    );
  }
  if (ex.response?.status === 401) {
    return 'Please sign in again.';
  }
  if (!ex.response) {
    return 'Cannot reach API. Use `npm run dev` for backend (port 5000) and frontend (port 5173), or set VITE_API_URL.';
  }
  return ex.message || 'Something went wrong';
}

export default function QuizPage() {
  const [limits, setLimits] = useState<LimitRow[]>(DEFAULT_LIMITS);
  const [limitsLoaded, setLimitsLoaded] = useState(false);
  const [limitsWarn, setLimitsWarn] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{
    scorePercent: number;
    correctCount: number;
    totalCount: number;
    subject: string;
    breakdown: BreakdownItem[];
  } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadLimits = useCallback(async () => {
    setLimitsWarn('');
    try {
      const { data } = await api.get<{ perSubject: LimitRow[] }>('/quizzes/limits');
      const list = data.perSubject?.length ? data.perSubject : DEFAULT_LIMITS;
      setLimits(list);
      setSelectedSubject((prev) => {
        if (prev && list.some((l) => l.subject === prev)) return prev;
        return list[0]?.subject || 'Mathematics';
      });
    } catch (e) {
      setLimits(DEFAULT_LIMITS);
      setLimitsWarn(formatApiError(e));
    } finally {
      setLimitsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  const subjectToStart = customSubject.trim() || selectedSubject;
  const limitRow = limits.find(
    (l) =>
      l.subject === subjectToStart ||
      l.subjectKey === subjectToStart.trim().toLowerCase() ||
      normalizeKey(l.subject) === normalizeKey(subjectToStart)
  );
  const remaining = limitRow?.remainingThisWeek ?? MAX_PER_WEEK;

  const start = async () => {
    setErr('');
    setResult(null);
    if (!subjectToStart) {
      setErr('Pick a subject or enter a custom one.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{
        sessionId: string;
        questions: QuizQuestion[];
      }>('/quizzes/start', { subject: subjectToStart, questionCount: 8 });
      const sid = data.sessionId != null ? String(data.sessionId) : '';
      if (!sid || !data.questions?.length) {
        setErr('Invalid response from server. Try again.');
        return;
      }
      setSessionId(sid);
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => 0));
      await loadLimits();
    } catch (e: unknown) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const setAnswer = (qi: number, opt: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = opt;
      return next;
    });
  };

  const submit = async () => {
    if (!sessionId || !questions.length) return;
    setErr('');
    setBusy(true);
    try {
      const { data } = await api.post<{
        scorePercent: number;
        correctCount: number;
        totalCount: number;
        subject: string;
        breakdown: BreakdownItem[];
      }>('/quizzes/submit', { sessionId: String(sessionId), answers });
      setResult(data);
      setSessionId(null);
      setQuestions([]);
      setAnswers([]);
      await loadLimits();
    } catch (e: unknown) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="study-page-header">
        <div className="study-greeting">Mock test & quiz</div>
        <div className="study-sub">
          Random MCQs for any subject · Max <strong style={{ color: '#fff' }}>2 completed tests per subject</strong> per{' '}
          <strong style={{ color: '#fff' }}>7-day</strong> window · Results saved to your{' '}
          <Link to="/profile" style={{ color: '#a78bfa' }}>
            profile
          </Link>
        </div>
      </div>

      {limitsWarn && (
        <div className="study-card" style={{ marginBottom: 16, borderColor: 'rgba(251,191,36,0.35)' }}>
          <div className="study-badge study-badge-amber" style={{ marginBottom: 8 }}>
            Limits API
          </div>
          <p className="study-sub" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {limitsWarn} Using default subject list; you can still start a test if the backend is up.
          </p>
          <button type="button" className="study-btn study-btn-outline study-btn-sm" onClick={() => loadLimits()}>
            Retry
          </button>
        </div>
      )}

      {!sessionId && !result && (
        <div className="study-grid2">
          <div className="study-card">
            <div className="study-card-title" style={{ marginBottom: 14 }}>
              Choose subject
            </div>
            <div className="study-form-group">
              <label className="study-label">From your subjects</label>
              <select
                className="study-select"
                value={selectedSubject}
                disabled={!limitsLoaded}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setCustomSubject('');
                }}
              >
                {limits.map((l) => (
                  <option key={l.subjectKey} value={l.subject}>
                    {l.subject} — {l.remainingThisWeek}/{l.maxPerWeek} left this week
                  </option>
                ))}
              </select>
            </div>
            <div className="study-form-group">
              <label className="study-label">Or custom subject</label>
              <input
                className="study-input"
                placeholder="e.g. History, Computer Science"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </div>
            <p className="study-sub" style={{ marginBottom: 12 }}>
              Current topic: <span style={{ color: '#c4b5fd' }}>{subjectToStart || '—'}</span> · Remaining this week:{' '}
              <span style={{ color: remaining > 0 ? '#4ade80' : '#fca5a5' }}>{remaining}</span>
            </p>
            {err && <p className="study-error">{err}</p>}
            <button
              type="button"
              className="study-btn study-btn-primary"
              disabled={busy || remaining <= 0 || !limitsLoaded}
              onClick={start}
            >
              {busy ? 'Starting…' : 'Start mock test'}
            </button>
            {remaining <= 0 && (
              <p className="study-sub" style={{ marginTop: 10 }}>
                Limit reached for this subject. Try another subject or wait until the rolling 7-day window moves forward.
              </p>
            )}
          </div>
          <div className="study-card">
            <div className="study-card-title" style={{ marginBottom: 14 }}>
              How it works
            </div>
            <ul style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, paddingLeft: 18 }}>
              <li>Questions use OpenAI when OPENAI_API_KEY is set; otherwise a built-in question bank is used.</li>
              <li>Each test has 8 multiple-choice questions.</li>
              <li>Only submitted tests count toward the weekly cap.</li>
              <li>Scores and history appear on your Profile page.</li>
            </ul>
          </div>
        </div>
      )}

      {sessionId && questions.length > 0 && (
        <div className="study-card" style={{ marginBottom: 16 }}>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Answer all questions</div>
            <span className="study-badge study-badge-purple">{questions.length} Q</span>
          </div>
          {questions.map((q, qi) => (
            <div key={q.index} style={{ marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 10 }}>
                {qi + 1}. {q.text}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswer(qi, oi)}
                      style={{ accentColor: '#6c63ff' }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {err && <p className="study-error">{err}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="study-btn study-btn-primary" disabled={busy} onClick={submit}>
              {busy ? 'Submitting…' : 'Submit & see results'}
            </button>
            <button
              type="button"
              className="study-btn study-btn-outline"
              disabled={busy}
              onClick={() => {
                setSessionId(null);
                setQuestions([]);
                setAnswers([]);
                setErr('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div>
          <div className="study-insight-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Results — {result.subject}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
              Score:{' '}
              <strong style={{ color: '#a78bfa', fontSize: 22 }}>{result.scorePercent}%</strong> (
              {result.correctCount}/{result.totalCount} correct)
            </div>
          </div>
          <div className="study-card" style={{ marginBottom: 16 }}>
            <div className="study-section-ttl" style={{ marginBottom: 14 }}>
              Review
            </div>
            {result.breakdown.map((row) => (
              <div
                key={row.index}
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 12,
                  background: row.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${row.isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 6 }}>
                  {row.index + 1}. {row.text}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Your answer: <span style={{ color: '#fff' }}>{row.options[row.yourIndex]}</span> · Correct:{' '}
                  <span style={{ color: '#4ade80' }}>{row.options[row.correctIndex]}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="study-btn study-btn-primary"
              onClick={() => {
                setResult(null);
                loadLimits();
              }}
            >
              Take another test
            </button>
            <Link to="/profile" className="study-btn study-btn-outline" style={{ textAlign: 'center', lineHeight: '1.2' }}>
              View profile & history
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function normalizeKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
