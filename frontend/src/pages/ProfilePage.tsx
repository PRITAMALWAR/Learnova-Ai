import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PREF_OPTIONS = [
  { value: 'morning', label: 'Morning Person (6AM–2PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM–8PM)' },
  { value: 'night', label: 'Night Owl (6PM–12AM)' },
  { value: 'flexible', label: 'Flexible' },
];

type QuizResultRow = {
  id: string;
  subject: string;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  completedAt: string;
};

type ProfileQuizStats = {
  totalCompleted: number;
  completedThisWeek: number;
  overallAvgScore: number | null;
  subjectAverages: { subject: string; attempts: number; avgScore: number; lastAt: string }[];
  limits: { maxPerSubjectPerWeek: number; windowDays: number };
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [examTrack, setExamTrack] = useState('');
  const [targetExamDate, setTargetExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(7);
  const [studyPreference, setStudyPreference] = useState('flexible');
  const [savedMsg, setSavedMsg] = useState('');
  const [err, setErr] = useState('');
  const [history, setHistory] = useState<QuizResultRow[]>([]);
  const [qStats, setQStats] = useState<ProfileQuizStats | null>(null);
  const [quizErr, setQuizErr] = useState('');

  const loadQuiz = useCallback(async () => {
    setQuizErr('');
    try {
      const [h, s] = await Promise.all([
        api.get<{ results: QuizResultRow[] }>('/quizzes/history?limit=15'),
        api.get<ProfileQuizStats>('/quizzes/profile-stats'),
      ]);
      setHistory(h.data.results || []);
      setQStats(s.data);
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string } }; message?: string };
      setQuizErr(
        ex.response?.data?.message ||
          ex.message ||
          'Could not load quiz history. Ensure the backend is running with the latest code (quiz routes).'
      );
      setHistory([]);
      setQStats(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setExamTrack(user.examTrack || '');
    setTargetExamDate(user.targetExamDate ? user.targetExamDate.slice(0, 10) : '');
    setHoursPerDay(user.hoursPerDay ?? 7);
    setStudyPreference(user.studyPreference || 'flexible');
  }, [user]);

  useEffect(() => {
    loadQuiz().catch(() => {});
  }, [loadQuiz]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSavedMsg('');
    try {
      const prefLabel = PREF_OPTIONS.find((p) => p.value === studyPreference)?.label || studyPreference;
      await api.patch('/users/profile', {
        name,
        examTrack,
        targetExamDate: targetExamDate || null,
        hoursPerDay,
        studyPreference: prefLabel,
      });
      await refreshUser();
      setSavedMsg('Profile saved.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed';
      setErr(msg);
    }
  };

  return (
    <>
      <div className="study-page-header">
        <div className="study-greeting">Profile</div>
        <div className="study-sub">Account settings and mock-test performance</div>
      </div>

      <div className="study-grid2">
        <div className="study-card">
          <div className="study-card-title" style={{ marginBottom: 16 }}>
            Your details
          </div>
          <form onSubmit={saveProfile}>
            <div className="study-form-group">
              <label className="study-label">Email</label>
              <input className="study-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="study-form-group">
              <label className="study-label">Name</label>
              <input className="study-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="study-form-group">
              <label className="study-label">Exam / goal</label>
              <input className="study-input" value={examTrack} onChange={(e) => setExamTrack(e.target.value)} />
            </div>
            <div className="study-form-group">
              <label className="study-label">Target exam date</label>
              <input
                className="study-input"
                type="date"
                value={targetExamDate}
                onChange={(e) => setTargetExamDate(e.target.value)}
              />
            </div>
            <div className="study-form-group">
              <label className="study-label">Daily study hours</label>
              <input
                className="study-input"
                type="number"
                min={1}
                max={16}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
              />
            </div>
            <div className="study-form-group">
              <label className="study-label">Study preference</label>
              <select
                className="study-select"
                value={studyPreference}
                onChange={(e) => setStudyPreference(e.target.value)}
              >
                {PREF_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
              Streak: <strong style={{ color: '#fbbf24' }}>{user?.studyStreak ?? 0}</strong> days
            </div>
            {err && <p className="study-error">{err}</p>}
            {savedMsg && <p style={{ color: '#4ade80', fontSize: 13, marginBottom: 8 }}>{savedMsg}</p>}
            <button type="submit" className="study-btn study-btn-primary">
              Save profile
            </button>
          </form>
        </div>

        <div className="study-card">
          <div className="study-card-title" style={{ marginBottom: 16 }}>
            Mock test stats
          </div>
          {quizErr && (
            <p className="study-error" style={{ marginBottom: 12 }}>
              {quizErr}{' '}
              <button type="button" className="study-btn study-btn-outline study-btn-sm" onClick={() => loadQuiz()}>
                Retry
              </button>
            </p>
          )}
          {qStats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
                <div className="study-sub">Total completed</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{qStats.totalCompleted}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
                <div className="study-sub">This week</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{qStats.completedThisWeek}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
                <div className="study-sub">Overall avg score</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#a78bfa' }}>
                  {qStats.overallAvgScore != null ? `${qStats.overallAvgScore}%` : '—'}
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
                <div className="study-sub">Weekly limit</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginTop: 4 }}>
                  {qStats.limits.maxPerSubjectPerWeek} / subject / {qStats.limits.windowDays}d
                </div>
              </div>
            </div>
          )}
          {qStats && qStats.subjectAverages.length > 0 && (
            <>
              <div className="study-section-ttl" style={{ marginBottom: 10 }}>
                By subject
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qStats.subjectAverages.map((s) => (
                  <div
                    key={s.subject}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <span style={{ color: '#fff' }}>{s.subject}</span>
                    <span style={{ color: '#c4b5fd' }}>
                      avg {s.avgScore}% · {s.attempts} attempt{s.attempts !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="study-card" style={{ marginTop: 16 }}>
        <div className="study-section-hdr">
          <div className="study-section-ttl">Recent mock tests</div>
        </div>
        {history.length === 0 && <p className="study-sub">No completed tests yet. Start one from the Mock test page.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((r) => (
            <div
              key={r.id}
              className="study-notif-card"
              style={{ marginBottom: 0, alignItems: 'center' }}
            >
              <div className="study-notif-dot" style={{ background: r.scorePercent >= 70 ? '#4ade80' : '#fbbf24' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{r.subject}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {r.completedAt ? format(new Date(r.completedAt), 'MMM d, yyyy · h:mm a') : ''}
                </div>
              </div>
              <span className="study-badge study-badge-purple">
                {r.scorePercent}% ({r.correctCount}/{r.totalCount})
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
