import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Subject } from '../types';

export default function WeakAreasPage() {
  const [summary, setSummary] = useState('');
  const [weak, setWeak] = useState<Subject[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ summary: string; weakSubjects: Subject[] }>('/plans/weak-insight');
        setSummary(data.summary);
        setWeak(data.weakSubjects || []);
      } catch {
        setSummary('Tag weak subjects in Plan Generator to personalize this view.');
      }
    })();
  }, []);

  const weakNames = weak.map((s) => s.name).join(' and ');

  return (
    <>
      <div className="study-page-header">
        <div className="study-greeting">Weak Area Analysis</div>
        <div className="study-sub">AI-powered insights based on your performance data</div>
      </div>

      <div className="study-insight-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd', marginBottom: 6 }}>
              Insight · From your profile
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
              {weakNames ? (
                <>
                  You marked <strong style={{ color: '#fff' }}>{weakNames}</strong> as focus areas. Allocate extra
                  blocks to these topics in your next generated plan.
                </>
              ) : (
                summary
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="study-grid2" style={{ marginTop: 16 }}>
        <div>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Weak Topics Radar</div>
          </div>
          <div className="study-card">
            <svg viewBox="0 0 220 200" width="100%">
              <g transform="translate(110,105)">
                <polygon
                  points="0,-70 60,-35 60,35 0,70 -60,35 -60,-35"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <polygon
                  points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <polygon
                  points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <polygon
                  points="0,-55 32,-44 50,10 15,60 -50,25 -45,-30"
                  fill="rgba(108,99,255,0.25)"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                />
                {[
                  [0, -78, 'middle', 'Math'],
                  [68, -38, 'start', 'Physics'],
                  [68, 40, 'start', 'Chem'],
                  [0, 82, 'middle', 'Bio'],
                  [-68, 40, 'end', 'English'],
                  [-68, -38, 'end', 'Revision'],
                ].map(([x, y, anchor, label]) => (
                  <text
                    key={label}
                    x={x as number}
                    y={y as number}
                    textAnchor={anchor as 'start' | 'middle' | 'end'}
                    fontSize={9}
                    fill="rgba(255,255,255,0.5)"
                    fontFamily="Inter"
                  >
                    {label}
                  </text>
                ))}
              </g>
            </svg>
          </div>
        </div>

        <div>
          <div className="study-section-hdr">
            <div className="study-section-ttl">Improvement Tips</div>
          </div>
          <div className="study-card">
            {[
              {
                t: 'Organic Chemistry — Focus on mechanisms',
                d: 'Practice reaction mechanisms daily. Use flashcards for functional groups.',
              },
              {
                t: 'Electromagnetism — Visualise field lines',
                d: 'Use simulations and draw diagrams for every problem.',
              },
              {
                t: 'Take a mock test every few days',
                d: 'Timed practice reduces anxiety and surfaces blind spots.',
              },
              {
                t: 'Spaced repetition for formulas',
                d: 'Revise at 1-day, 3-day, and 7-day intervals.',
              },
            ].map((tip, i) => (
              <div key={tip.t} className="study-tip-row" style={i === 3 ? { border: 'none' } : undefined}>
                <div className="study-tip-num">{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{tip.t}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tip.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="study-card" style={{ marginTop: 12 }}>
            <div className="study-card-title" style={{ marginBottom: 14 }}>
              Topic-wise Accuracy (sample)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { n: 'Organic Chem', w: 38, ok: false },
                { n: 'Electromag.', w: 45, ok: false },
                { n: 'Calculus', w: 78, ok: true },
                { n: 'Thermody.', w: 62, ok: null },
              ].map((row) => (
                <div key={row.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 110 }}>{row.n}</span>
                  <div className="study-progress-bar" style={{ flex: 1 }}>
                    <div
                      className="study-progress-fill"
                      style={{
                        width: `${row.w}%`,
                        background:
                          row.ok === true
                            ? 'linear-gradient(90deg,#34d399,#6ee7b7)'
                            : row.ok === false
                              ? 'linear-gradient(90deg,#f87171,#fca5a5)'
                              : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      width: 36,
                      textAlign: 'right',
                      color: row.ok === true ? '#6ee7b7' : row.ok === false ? '#fca5a5' : '#fcd34d',
                    }}
                  >
                    {row.w}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
