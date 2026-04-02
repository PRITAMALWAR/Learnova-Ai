import OpenAI from 'openai';

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const SYSTEM = `You are an exam setter for high-school / JEE level. Output ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "text": "clear multiple-choice stem",
      "options": ["A","B","C","D"],
      "correctIndex": 0-3
    }
  ]
}
Exactly 4 options per question. correctIndex is 0-based. Questions must be original and subject-appropriate.`;

const FALLBACK_BANK = {
  mathematics: [
    {
      text: 'What is the derivative of x² with respect to x?',
      options: ['x', '2x', 'x²', '2'],
      correctIndex: 1,
    },
    {
      text: 'Value of sin(90°) is:',
      options: ['0', '1', '1/2', '√2/2'],
      correctIndex: 1,
    },
    {
      text: 'Integral of 1/x dx is:',
      options: ['x + C', 'ln|x| + C', '1/x² + C', 'e^x + C'],
      correctIndex: 1,
    },
    {
      text: 'If a quadratic has discriminant D < 0, roots are:',
      options: ['real and equal', 'real and distinct', 'complex', 'integers only'],
      correctIndex: 2,
    },
  ],
  physics: [
    {
      text: 'SI unit of force is:',
      options: ['Joule', 'Newton', 'Watt', 'Pascal'],
      correctIndex: 1,
    },
    {
      text: 'Speed of light in vacuum is approximately:',
      options: ['3×10⁶ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s', '340 m/s'],
      correctIndex: 1,
    },
    {
      text: "Ohm's law relates V, I and:",
      options: ['Power', 'Resistance', 'Capacitance', 'Frequency'],
      correctIndex: 1,
    },
    {
      text: 'Kinetic energy is proportional to:',
      options: ['v', 'v²', '√v', '1/v'],
      correctIndex: 1,
    },
  ],
  chemistry: [
    {
      text: 'Atomic number represents:',
      options: ['Neutron count', 'Proton count', 'Mass number', 'Isotope weight'],
      correctIndex: 1,
    },
    {
      text: 'pH < 7 means a solution is:',
      options: ['Basic', 'Acidic', 'Neutral', 'Salt only'],
      correctIndex: 1,
    },
    {
      text: 'Isotopes of an element differ in:',
      options: ['Protons', 'Electrons', 'Neutrons', 'Atomic number'],
      correctIndex: 2,
    },
    {
      text: 'CH₄ is an example of:',
      options: ['Alkene', 'Alkane', 'Alkyne', 'Alcohol'],
      correctIndex: 1,
    },
  ],
  biology: [
    {
      text: 'Mitochondria are mainly responsible for:',
      options: ['Photosynthesis', 'ATP production', 'Protein synthesis', 'DNA replication'],
      correctIndex: 1,
    },
    {
      text: 'The powerhouse of the cell is:',
      options: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi'],
      correctIndex: 2,
    },
  ],
  english: [
    {
      text: 'Choose the correct sentence:',
      options: ['He don’t like it.', 'He doesn’t like it.', 'He not like it.', 'He doesn’t likes it.'],
      correctIndex: 1,
    },
    {
      text: '“Beautiful” is an example of:',
      options: ['Noun', 'Verb', 'Adjective', 'Adverb'],
      correctIndex: 2,
    },
  ],
  general: [
    {
      text: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctIndex: 1,
    },
    {
      text: 'H₂O is commonly known as:',
      options: ['Oxygen', 'Hydrogen', 'Water', 'Salt'],
      correctIndex: 2,
    },
    {
      text: 'Capital of France is:',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctIndex: 2,
    },
    {
      text: '10² equals:',
      options: ['10', '100', '1000', '20'],
      correctIndex: 1,
    },
  ],
};

function pickBank(subjectKey) {
  if (subjectKey.includes('math')) return FALLBACK_BANK.mathematics;
  if (subjectKey.includes('phys')) return FALLBACK_BANK.physics;
  if (subjectKey.includes('chem')) return FALLBACK_BANK.chemistry;
  if (subjectKey.includes('bio')) return FALLBACK_BANK.biology;
  if (subjectKey.includes('english')) return FALLBACK_BANK.english;
  return FALLBACK_BANK.general;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fallbackQuestions(subjectKey, count = 8) {
  const bank = pickBank(subjectKey);
  const pool = shuffle([...bank, ...FALLBACK_BANK.general]);
  const out = [];
  const seen = new Set();
  for (const q of pool) {
    const key = q.text.slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: q.text,
      options: [...q.options],
      correctIndex: q.correctIndex,
    });
    if (out.length >= count) break;
  }
  while (out.length < count) {
    const g = FALLBACK_BANK.general[out.length % FALLBACK_BANK.general.length];
    out.push({ text: g.text, options: [...g.options], correctIndex: g.correctIndex });
  }
  return out.slice(0, count);
}

export async function generateQuizQuestions(subjectDisplay, subjectKey, count = 8) {
  const client = getClient();
  const n = Math.min(12, Math.max(5, count));

  if (!client) {
    return fallbackQuestions(subjectKey, n);
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Create exactly ${n} multiple-choice questions for the subject: "${subjectDisplay}". Vary difficulty. JSON only.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    const text = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);
    const qs = parsed.questions;
    if (!Array.isArray(qs) || qs.length < 3) return fallbackQuestions(subjectKey, n);

    const mapped = qs
      .filter((q) => q.text && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === 'number')
      .map((q) => ({
        text: String(q.text),
        options: q.options.map(String),
        correctIndex: Math.min(3, Math.max(0, q.correctIndex)),
      }))
      .slice(0, n);

    if (mapped.length < 5) return fallbackQuestions(subjectKey, n);
    return mapped;
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    const msg = e?.message || String(e);
    if (status === 429 || /quota|billing|exceeded your current/i.test(msg)) {
      console.warn('[quizGenerator] OpenAI quota/billing — using built-in questions.');
    } else {
      console.warn('[quizGenerator] OpenAI error — using built-in questions.', msg.slice(0, 120));
    }
    return fallbackQuestions(subjectKey, n);
  }
}
