import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Analytics = {
  windowDays: number;
  completed: number;
  pending: number;
  total: number;
  bySubject: Record<string, { done: number; total: number }>;
};

export default function ProgressPage() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await api.get<Analytics>('/tasks/analytics');
        setData(d);
      } catch {
        setData(null);
      }
    })();
  }, []);

  const entries = data ? Object.entries(data.bySubject) : [];
  const overall =
    data && data.total ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <>
      <div className="study-page-header">
        <div className="study-greeting">Progress Tracking</div>
        <div className="study-sub">Your performance analytics for the past 30 days</div>
      </div>

      <div className="study-grid4" style={{ marginBottom: 20 }}>
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Tasks Done</div>
          <div className="study-card-val">{data?.completed ?? 0}</div>
          <div className="study-stat-change">
            <span style={{ color: '#4ade80' }}>▲ window</span>
          </div>
        </div>
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Pending</div>
          <div className="study-card-val">{data?.pending ?? 0}</div>
          <div className="study-stat-change">
            <span style={{ color: '#f87171' }}>▼ backlog</span>
          </div>
        </div>
        <div className="study-card" style={{ padding: 16, textAlign: 'center' }}>
          <div className="study-card-title">Streak</div>
          <div className="study-streak-num">{user?.studyStreak ?? 0}</div>
          <div className="study-card-sub">🔥 days</div>
        </div>
        <div className="study-card" style={{ padding: 16 }}>
          <div className="study-card-title">Accuracy</div>
          <div className="study-card-val">{overall}%</div>
          <div className="study-stat-change">
            <span style={{ color: '#4ade80' }}>completion rate</span>
          </div>
        </div>
      </div>

      <div className="study-grid2">
        <div className="study-card">
          <div className="study-section-hdr">
            <div className="study-section-ttl">Weekly Hours</div>
            <span className="study-badge study-badge-purple">Illustrative</span>
          </div>
          <svg viewBox="0 0 260 130" width="100%">
            <defs>
              <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6c63ff" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <rect x="20" y="35" width="28" height="80" rx="5" fill="rgba(108,99,255,0.3)" />
            <rect x="75" y="20" width="28" height="95" rx="5" fill="rgba(108,99,255,0.5)" />
            <rect x="130" y="28" width="28" height="87" rx="5" fill="rgba(108,99,255,0.4)" />
            <rect x="185" y="10" width="28" height="105" rx="5" fill="rgba(108,99,255,0.7)" />
            {['Wk1', 'Wk2', 'Wk3', 'Wk4'].map((w, i) => (
              <text
                key={w}
                x={26 + i * 55}
                y={130}
                fontSize={9}
                fill="rgba(255,255,255,0.35)"
                fontFamily="Inter"
              >
                {w}
              </text>
            ))}
          </svg>
        </div>

        <div className="study-card">
          <div className="study-section-hdr">
            <div className="study-section-ttl">Completed vs Pending</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {entries.length === 0 && <p className="study-sub">Complete tasks to see per-topic breakdown.</p>}
            {entries.map(([name, s], i) => {
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
              const gradients = [
                'linear-gradient(90deg,#60a5fa,#818cf8)',
                'linear-gradient(90deg,#a78bfa,#c4b5fd)',
                'linear-gradient(90deg,#34d399,#6ee7b7)',
                'linear-gradient(90deg,#f59e0b,#fbbf24)',
              ];
              return (
                <div key={name}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.55)',
                      marginBottom: 6,
                    }}
                  >
                    <span>{name}</span>
                    <span>
                      {s.done} / {s.total}
                    </span>
                  </div>
                  <div className="study-progress-bar">
                    <div
                      className="study-progress-fill"
                      style={{ width: `${pct}%`, background: gradients[i % gradients.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="study-divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Overall completion</span>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>{overall}%</span>
          </div>
        </div>
      </div>
    </>
  );
}
