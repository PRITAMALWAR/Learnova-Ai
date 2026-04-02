import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Subject } from '../types';

const PRESET_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
];

const PREF_OPTIONS = [
  'Morning Person (6AM–2PM)',
  'Afternoon (12PM–8PM)',
  'Night Owl (6PM–12AM)',
  'Flexible',
];

const BREAK_OPTIONS = ['Short breaks (10 min / 1hr)', 'Pomodoro (25 + 5 min)', 'Long breaks (30 min / 2hr)'];

export default function PlanPage() {
  const nav = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(['Mathematics', 'Physics', 'Chemistry']));
  const [weakSel, setWeakSel] = useState<Set<string>>(new Set(['Chemistry']));
  const [hours, setHours] = useState(7);
  const [examDate, setExamDate] = useState('2026-06-28');
  const [pref, setPref] = useState(PREF_OPTIONS[0]);
  const [targetScore, setTargetScore] = useState(85);
  const [breakStyle, setBreakStyle] = useState(BREAK_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ subjects: Subject[] }>('/subjects');
        setSubjects(data.subjects);
        const weakFromDb = new Set(data.subjects.filter((s) => s.isWeak).map((s) => s.name));
        if (weakFromDb.size) setWeakSel((prev) => new Set([...prev, ...weakFromDb]));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const toggleSubject = (name: string) => {
    const n = new Set(selected);
    if (n.has(name)) n.delete(name);
    else n.add(name);
    setSelected(n);
  };

  const toggleWeak = (name: string) => {
    const n = new Set(weakSel);
    if (n.has(name)) n.delete(name);
    else n.add(name);
    setWeakSel(n);
  };

  const ensureSubjectsAndSyncWeak = async () => {
    let { data: list } = await api.get<{ subjects: Subject[] }>('/subjects');
    const existing = new Set(list.subjects.map((s) => s.name));
    for (const name of selected) {
      if (!existing.has(name)) {
        await api.post('/subjects', {
          name,
          isWeak: weakSel.has(name),
        });
        existing.add(name);
      }
    }
    const refreshed = await api.get<{ subjects: Subject[] }>('/subjects');
    list = refreshed.data;
    setSubjects(list.subjects);
    for (const s of list.subjects) {
      const shouldWeak = weakSel.has(s.name);
      if (s.isWeak !== shouldWeak) {
        await api.patch(`/subjects/${s._id}`, { isWeak: shouldWeak });
      }
    }
  };

  const saveProfile = async () => {
    await api.patch('/users/profile', {
      targetExamDate: examDate,
      hoursPerDay: hours,
      studyPreference: pref,
    });
  };

  const generate = async () => {
    setErr('');
    setBusy(true);
    try {
      await saveProfile();
      await ensureSubjectsAndSyncWeak();
      const subjectNames = [...selected];
      const weakSubjectNames = [...weakSel].filter((w) => subjectNames.includes(w));
      const { data } = await api.post<{ planSource?: 'openai' | 'template' }>('/plans/generate', {
        subjectNames,
        weakSubjectNames,
        hoursPerDay: hours,
        examDate,
        studyPreferenceLabel: pref,
        targetScore,
        breakStyle,
        additionalNotes: notes,
      });
      nav('/timetable', {
        state: { planSource: data.planSource === 'openai' ? 'openai' : 'template' },
      });
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string; errors?: { msg: string }[] } } };
      const d = ex.response?.data;
      const msg =
        d?.message ||
        (Array.isArray(d?.errors) && d.errors.length ? d.errors.map((x) => x.msg).join(' · ') : null) ||
        'Failed to generate';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const allNames = [...new Set([...PRESET_SUBJECTS, ...subjects.map((s) => s.name)])];

  return (
    <>
      <div className="study-page-header">
        <div className="study-greeting">AI Plan Generator</div>
        <div className="study-sub">Fill in your details and let AI craft your perfect study schedule</div>
      </div>
      <div className="study-grid2">
        <div>
          <div className="study-card" style={{ marginBottom: 16 }}>
            <div className="study-card-title" style={{ marginBottom: 16 }}>
              Subject Selection
            </div>
            <div className="study-form-group">
              <label className="study-label">Select Your Subjects</label>
              <div className="study-tags-row">
                {allNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`study-tag${selected.has(name) ? ' sel' : ''}`}
                    onClick={() => toggleSubject(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="study-form-group">
              <label className="study-label">Daily Study Hours</label>
              <input
                type="range"
                min={2}
                max={12}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                style={{ padding: 0, border: 'none', background: 'none', accentColor: '#6c63ff' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 6,
                }}
              >
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>2h</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#a78bfa' }}>{hours}h</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>12h</span>
              </div>
            </div>
            <div className="study-form-group">
              <label className="study-label">Target Exam Date</label>
              <input className="study-input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div className="study-form-group">
              <label className="study-label">Study Preference</label>
              <select className="study-select" value={pref} onChange={(e) => setPref(e.target.value)}>
                {PREF_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="study-card" style={{ marginBottom: 16 }}>
            <div className="study-card-title" style={{ marginBottom: 16 }}>
              Weak Areas & Goals
            </div>
            <div className="study-form-group">
              <label className="study-label">Mark Your Weak Subjects</label>
              <div className="study-tags-row">
                {[...selected].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`study-tag${weakSel.has(name) ? ' sel' : ''}`}
                    onClick={() => toggleWeak(name)}
                    style={
                      weakSel.has(name)
                        ? {
                            borderColor: 'rgba(248,113,113,0.6)',
                            color: '#fca5a5',
                            background: 'rgba(248,113,113,0.25)',
                          }
                        : {
                            borderColor: 'rgba(248,113,113,0.4)',
                            color: '#fca5a5',
                            background: 'rgba(248,113,113,0.1)',
                          }
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="study-form-group">
              <label className="study-label">Target Score (%)</label>
              <input
                className="study-input"
                type="number"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
              />
            </div>
            <div className="study-form-group">
              <label className="study-label">Break Duration</label>
              <select className="study-select" value={breakStyle} onChange={(e) => setBreakStyle(e.target.value)}>
                {BREAK_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="study-form-group">
              <label className="study-label">Additional Notes</label>
              <textarea
                className="study-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tuition Tue/Thu evenings..."
              />
            </div>
          </div>
          {err && <p className="study-error">{err}</p>}
          <button
            type="button"
            className="study-btn study-btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 14, borderRadius: 14 }}
            disabled={busy || selected.size === 0}
            onClick={generate}
          >
            {busy ? 'Generating…' : '✦ Generate AI Timetable'}
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
            Uses OpenAI when configured · Falls back to a balanced template offline
          </div>
        </div>
      </div>
    </>
  );
}
