import OpenAI from 'openai';

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const SYSTEM = `You are an expert academic coach. Output ONLY valid JSON matching this shape (no markdown):
{
  "weekLabel": "string describing the week range",
  "slots": [
    {
      "dayOfWeek": 0-6 (0=Sunday, 1=Monday, ... 6=Saturday),
      "hourLabel": "e.g. 6 AM, 8 AM, 10 AM, 2 PM, 6 PM",
      "title": "short label e.g. Math, Physics, Chem, Revision, Mock Test",
      "category": "study|revision|mock|break",
      "colorToken": "blue|purple|green|amber|red"
    }
  ]
}
Balance subjects across the week. Respect weak areas with extra slots. Keep hourLabel aligned to typical student blocks (6 AM - 9 PM). Aim for 15-40 slots for a full week depending on hours per day.`;

export async function generateWeeklyPlanPayload({
  subjects,
  weakSubjects,
  hoursPerDay,
  examDate,
  studyPreference,
  targetScore,
  breakStyle,
  additionalNotes,
}) {
  const client = getClient();
  const weak = weakSubjects?.length ? weakSubjects.join(', ') : 'none specified';
  const subs = subjects?.length ? subjects.join(', ') : 'General study';

  const userMsg = `Create a personalized weekly study timetable.
Subjects: ${subs}
Weak subjects (prioritize): ${weak}
Available study hours per day: ${hoursPerDay}
Target exam date: ${examDate ? String(examDate) : 'not set'}
Study preference (time of day): ${studyPreference}
Target score (%): ${targetScore ?? 'not set'}
Break style: ${breakStyle ?? 'standard'}
Extra constraints: ${additionalNotes || 'none'}

Ensure variety, rest implied between heavy blocks, and mock/revision spread across the week.`;

  if (!client) {
    return fallbackPlan({ subjects, hoursPerDay, weakSubjects });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fallbackPlan({ subjects, hoursPerDay, weakSubjects });
    }

    if (!parsed.slots || !Array.isArray(parsed.slots)) {
      return fallbackPlan({ subjects, hoursPerDay, weakSubjects });
    }

    return {
      source: 'openai',
      weekLabel: parsed.weekLabel || 'This week',
      slots: parsed.slots
        .filter((s) => typeof s.dayOfWeek === 'number' && s.hourLabel && s.title)
        .map((s) => ({
          dayOfWeek: Math.min(6, Math.max(0, s.dayOfWeek)),
          hourLabel: String(s.hourLabel),
          title: String(s.title),
          category: s.category || 'study',
          colorToken: ['blue', 'purple', 'green', 'amber', 'red'].includes(s.colorToken)
            ? s.colorToken
            : 'blue',
        })),
    };
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    const code = e?.code ?? e?.error?.code;
    const msg = e?.message || String(e);
    const quota =
      status === 429 ||
      code === 'insufficient_quota' ||
      /quota|billing|exceeded your current/i.test(msg);
    console.warn(
      quota
        ? '[openaiPlan] OpenAI quota/billing or rate limit — using template plan.'
        : '[openaiPlan] OpenAI error — using template plan.',
      msg.slice(0, 200)
    );
    return fallbackPlan({ subjects, hoursPerDay, weakSubjects });
  }
}

function fallbackPlan({ subjects, hoursPerDay, weakSubjects }) {
  const base = subjects?.length ? subjects : ['Mathematics', 'Physics', 'Chemistry'];
  const slots = [];
  const hours = Math.min(12, Math.max(2, hoursPerDay || 6));
  const blocks = Math.min(5, Math.ceil(hours / 2));
  const labels = ['6 AM', '8 AM', '10 AM', '2 PM', '6 PM'].slice(0, blocks);

  for (let d = 1; d <= 6; d++) {
    for (let b = 0; b < blocks; b++) {
      const idx = (d + b) % base.length;
      const isWeak = weakSubjects?.some(
        (w) => base[idx].toLowerCase().includes(String(w).toLowerCase())
      );
      slots.push({
        dayOfWeek: d,
        hourLabel: labels[b] || `${8 + b * 2} AM`,
        title: base[idx],
        category: 'study',
        colorToken: isWeak ? 'red' : ['blue', 'purple', 'green'][idx % 3],
      });
    }
  }
  slots.push({
    dayOfWeek: 0,
    hourLabel: '10 AM',
    title: 'Revision',
    category: 'revision',
    colorToken: 'amber',
  });

  return {
    source: 'template',
    weekLabel: 'Template plan (built-in schedule — no OpenAI or quota/billing issue)',
    slots,
  };
}
