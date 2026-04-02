import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../api/client';
import type { WeeklyPlan } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COLORS: Record<string, { bg: string; color: string }> = {
  blue: { bg: 'rgba(99,179,237,0.25)', color: '#7dd3fc' },
  purple: { bg: 'rgba(167,139,250,0.25)', color: '#c4b5fd' },
  green: { bg: 'rgba(52,211,153,0.2)', color: '#6ee7b7' },
  amber: { bg: 'rgba(251,191,36,0.2)', color: '#fcd34d' },
  red: { bg: 'rgba(248,113,113,0.2)', color: '#fca5a5' },
};

function slotStyle(token?: string) {
  return COLORS[token || 'blue'] || COLORS.blue;
}

type LocState = { planSource?: 'openai' | 'template' };

export default function TimetablePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const genState = location.state as LocState | null;
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const dismissPlanNotice = () => {
    navigate(location.pathname, { replace: true, state: {} });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ plan: WeeklyPlan | null }>('/plans/latest');
      setPlan(data.plan);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rowLabels = useMemo(() => {
    if (!plan?.slots?.length) return [] as string[];
    return [...new Set(plan.slots.map((s) => s.hourLabel))].sort((a, b) => {
      const parse = (x: string) => {
        const m = x.match(/(\d{1,2})\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1], 10);
        const ap = m[2].toUpperCase();
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        return h;
      };
      return parse(a) - parse(b);
    });
  }, [plan]);

  const cell = (day: number, hour: string) => {
    if (!plan) return null;
    const s = plan.slots.find((x) => x.dayOfWeek === day && x.hourLabel === hour);
    if (!s) return null;
    const st = slotStyle(s.colorToken);
    return (
      <div className="study-time-block" style={{ background: st.bg, color: st.color }}>
        {s.title}
      </div>
    );
  };

  const todayDow = new Date().getDay();

  const downloadPdf = async () => {
    if (!plan?._id) return;
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${base}/plans/${plan._id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {genState?.planSource === 'template' && (
        <div
          className="study-card"
          style={{
            marginBottom: 16,
            borderColor: 'rgba(251,191,36,0.35)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="study-badge study-badge-amber" style={{ marginBottom: 8 }}>
              Template timetable
            </div>
            <p className="study-sub" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 720 }}>
              This week was built with the <strong style={{ color: '#fff' }}>built-in schedule</strong> (no OpenAI key,
              quota/billing limit, or API error). It still creates real tasks on your dashboard. Add OpenAI billing or
              leave the key empty to stay fully offline.
            </p>
          </div>
          <button type="button" className="study-btn study-btn-outline study-btn-sm" onClick={dismissPlanNotice}>
            Dismiss
          </button>
        </div>
      )}
      <div className="study-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="study-greeting">Weekly Timetable</div>
          <div className="study-sub">
            {plan
              ? `${format(new Date(plan.weekStart), 'MMM d')} – ${format(new Date(plan.weekEnd), 'MMM d, yyyy')} · AI Generated`
              : loading
                ? 'Loading…'
                : 'Generate a plan to see your week'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="study-btn study-btn-outline study-btn-sm" onClick={load}>
            Refresh
          </button>
          <button
            type="button"
            className="study-btn study-btn-primary study-btn-sm"
            disabled={!plan?._id}
            onClick={downloadPdf}
          >
            ⬇ Download PDF
          </button>
        </div>
      </div>

      {!plan && !loading && (
        <div className="study-card">
          <p className="study-sub">No timetable yet. Use Plan Generator to create one.</p>
        </div>
      )}

      {plan && (
        <>
          <div className="study-card" style={{ padding: 16, overflowX: 'auto' }}>
            <div className="study-cal-grid" style={{ minWidth: 520 }}>
              <div className="study-cal-head" />
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className="study-cal-head"
                  style={i === todayDow ? { color: '#a78bfa', fontWeight: 600 } : undefined}
                >
                  {d}
                </div>
              ))}
              {rowLabels.map((hour) => (
                <Fragment key={hour}>
                  <div className="study-cal-time">{hour}</div>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <div key={`${hour}-${day}`} className="study-cal-cell">
                      {cell(day, hour)}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(COLORS).map(([k, v]) => (
              <div
                key={k}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 3, background: v.bg }} />
                {k}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
