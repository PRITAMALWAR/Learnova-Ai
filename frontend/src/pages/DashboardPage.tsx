import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { StudyTask } from '../types';

function taskIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('math')) return { emoji: '🔢', bg: 'rgba(99,179,237,0.18)' };
  if (t.includes('phys')) return { emoji: '⚛️', bg: 'rgba(167,139,250,0.18)' };
  if (t.includes('chem')) return { emoji: '🧪', bg: 'rgba(52,211,153,0.18)' };
  if (t.includes('mock')) return { emoji: '📝', bg: 'rgba(251,191,36,0.12)' };
  return { emoji: '📚', bg: 'rgba(108,99,255,0.18)' };
}

function badgeFor(task: StudyTask): {
  cls: string;
  label: string;
  style?: CSSProperties;
} {
  if (task.status === 'completed') return { cls: 'study-badge-green', label: 'Done' };
  if (task.progress >= 70) return { cls: 'study-badge-blue', label: `${task.progress}%` };
  if (task.progress >= 40) return { cls: 'study-badge-amber', label: `${task.progress}%` };
  return {
    cls: '',
    label: 'Upcoming',
    style: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' },
  };
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, percent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ tasks: StudyTask[]; stats: typeof stats }>('/tasks/today');
        if (!cancelled) {
          setTasks(data.tasks);
          setStats(data.stats);
        }
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const examDays = useMemo(() => {
    if (!user?.targetExamDate) return null;
    const end = new Date(user.targetExamDate);
    const diff = Math.ceil((end.getTime() - Date.now()) / (86400 * 1000));
    return diff > 0 ? diff : 0;
  }, [user?.targetExamDate]);

  const markDone = async (id: string) => {
    await api.patch(`/tasks/${id}`, { status: 'completed' });
    const { data } = await api.get<{ tasks: StudyTask[]; stats: typeof stats }>('/tasks/today');
    setTasks(data.tasks);
    setStats(data.stats);
    refreshUser();
  };

  return (
    <>
      <div className="study-page-header">
        <div className="study-greeting">
          {greeting}, {user?.name?.split(' ')[0] || 'Student'} ☀️
        </div>
        <div className="study-sub">
          {format(new Date(), 'EEEE, MMMM dd')} · You have {stats.total || tasks.length} study sessions today
        </div>
      </div>

      <div className="study-grid4">
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Today&apos;s focus</div>
          <div className="study-card-val">{stats.total ? `${stats.completed}/${stats.total}` : '—'}</div>
          <div className="study-stat-change">
            <span style={{ color: '#4ade80' }}>Tasks</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>completed vs scheduled</span>
          </div>
        </div>
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Completed</div>
          <div className="study-card-val">
            {stats.total ? `${stats.completed} / ${stats.total}` : '0 / 0'}
          </div>
          <div className="study-stat-change">
            <span className="study-badge study-badge-green">{stats.percent || 0}%</span>
          </div>
        </div>
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Study Streak</div>
          <div className="study-card-val">🔥 {user?.studyStreak ?? 0}</div>
          <div className="study-card-sub">days in a row</div>
        </div>
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Exam In</div>
          <div className="study-card-val">{examDays ?? '—'}</div>
          <div className="study-card-sub">{examDays != null ? 'days remaining' : 'Set exam date in Plan'}</div>
        </div>
      </div>

      <div className="study-grid2">
        <div>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Today&apos;s Study Plan</div>
            <span className="study-badge study-badge-blue">{format(new Date(), 'MMM d')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading && <p className="study-sub">Loading tasks…</p>}
            {!loading && tasks.length === 0 && (
              <div className="study-card">
                <p className="study-sub" style={{ marginBottom: 12 }}>
                  No tasks for today yet. Generate a plan to populate your week.
                </p>
                <Link to="/plan" className="study-btn study-btn-primary">
                  + Generate Plan
                </Link>
              </div>
            )}
            {tasks.map((task) => {
              const { emoji, bg } = taskIcon(task.title);
              const b = badgeFor(task);
              return (
                <div
                  key={task._id}
                  className="study-subject-card"
                  style={{ opacity: task.status === 'completed' ? 0.75 : 1 }}
                >
                  <div className="study-subj-icon" style={{ background: bg }}>
                    {emoji}
                  </div>
                  <div className="study-subj-info">
                    <div className="study-subj-name">{task.title}</div>
                    <div className="study-subj-time">{task.detail || 'Scheduled block'}</div>
                    <div className="study-progress-bar" style={{ marginTop: 8 }}>
                      <div
                        className="study-progress-fill"
                        style={{
                          width: `${task.status === 'completed' ? 100 : task.progress}%`,
                          background: 'linear-gradient(90deg,#60a5fa,#818cf8)',
                        }}
                      />
                    </div>
                  </div>
                  {task.status !== 'completed' ? (
                    <button
                      type="button"
                      className="study-btn study-btn-outline study-btn-sm"
                      onClick={() => markDone(task._id)}
                    >
                      Mark done
                    </button>
                  ) : (
                    <span className={`study-badge ${b.cls}`} style={b.style}>
                      {b.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Weekly Overview</div>
          </div>
          <div className="study-card" style={{ marginBottom: 16 }}>
            <svg className="study-chart" viewBox="0 0 260 120">
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6c63ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 C30,60 50,40 80,50 C110,60 120,30 150,20 C180,10 200,40 230,30 C245,25 252,22 260,20"
                stroke="#6c63ff"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M0,80 C30,60 50,40 80,50 C110,60 120,30 150,20 C180,10 200,40 230,30 C245,25 252,22 260,20 L260,120 L0,120Z"
                fill="url(#ga)"
              />
              <path
                d="M0,90 C30,85 50,75 80,80 C110,85 120,70 150,65 C180,60 200,72 230,68"
                stroke="#a78bfa"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="4,3"
                opacity="0.6"
              />
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <text
                  key={d}
                  x={i * 36}
                  y={116}
                  fontSize={9}
                  fill="rgba(255,255,255,0.3)"
                  fontFamily="Inter"
                >
                  {d}
                </text>
              ))}
            </svg>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                <div style={{ width: 20, height: 2, background: '#6c63ff', borderRadius: 2 }} />
                This week
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                <div style={{ width: 20, height: 2, background: '#a78bfa', borderRadius: 2, borderTop: '2px dashed #a78bfa' }} />
                Last week
              </div>
            </div>
          </div>

          <div className="study-card">
            <div className="study-card-title" style={{ marginBottom: 16 }}>
              Subject distribution (sample)
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Math', pct: 62, stroke: '#6c63ff', dash: '109 67' },
                { label: 'Physics', pct: 50, stroke: '#a78bfa', dash: '88 88' },
                { label: 'Chem', pct: 40, stroke: '#34d399', dash: '70 106' },
              ].map((r) => (
                <div key={r.label} className="study-ring-wrap">
                  <svg width={70} height={70} viewBox="0 0 70 70">
                    <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                    <circle
                      cx="35"
                      cy="35"
                      r="28"
                      fill="none"
                      stroke={r.stroke}
                      strokeWidth="9"
                      strokeDasharray={r.dash}
                      strokeLinecap="round"
                      strokeDashoffset="-20"
                      transform="rotate(-90 35 35)"
                    />
                  </svg>
                  <div className="study-ring-label">{r.label}</div>
                  <div className="study-ring-pct" style={{ fontSize: 14 }}>
                    {r.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Link to="/plan" className="study-btn study-btn-primary" style={{ flex: 1, textAlign: 'center' }}>
              + Generate Plan
            </Link>
            <Link to="/timetable" className="study-btn study-btn-outline" style={{ flex: 1, textAlign: 'center' }}>
              View Timetable
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
