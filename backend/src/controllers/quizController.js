import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import QuizSession, {
  QUIZ_TESTS_PER_SUBJECT_PER_WEEK,
  QUIZ_WINDOW_MS,
  normalizeSubjectKey,
} from '../models/QuizSession.js';
import Subject from '../models/Subject.js';
import { generateQuizQuestions } from '../services/quizGenerator.js';

function userObjectId(userId) {
  try {
    return new mongoose.Types.ObjectId(String(userId));
  } catch {
    return null;
  }
}

async function completedCountInWindow(userId, subjectKey) {
  const since = new Date(Date.now() - QUIZ_WINDOW_MS);
  return QuizSession.countDocuments({
    userId,
    subjectKey,
    status: 'completed',
    completedAt: { $gte: since },
  });
}

export async function getLimits(req, res, next) {
  try {
    const uid = userObjectId(req.userId);
    if (!uid) return res.status(400).json({ message: 'Invalid user id' });

    const since = new Date(Date.now() - QUIZ_WINDOW_MS);
    const subs = await Subject.find({ userId: req.userId }).sort({ name: 1 });
    const names = subs.length ? subs.map((s) => s.name) : ['Mathematics', 'Physics', 'Chemistry'];

    const usage = await QuizSession.aggregate([
      {
        $match: {
          userId: uid,
          status: 'completed',
          completedAt: { $gte: since },
        },
      },
      { $group: { _id: '$subjectKey', count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(usage.map((u) => [u._id, u.count]));

    const perSubject = names.map((name) => {
      const key = normalizeSubjectKey(name);
      const used = map[key] || 0;
      return {
        subject: name,
        subjectKey: key,
        usedThisWeek: used,
        remainingThisWeek: Math.max(0, QUIZ_TESTS_PER_SUBJECT_PER_WEEK - used),
        maxPerWeek: QUIZ_TESTS_PER_SUBJECT_PER_WEEK,
      };
    });

    res.json({
      windowDays: 7,
      maxTestsPerSubjectPerWeek: QUIZ_TESTS_PER_SUBJECT_PER_WEEK,
      perSubject,
    });
  } catch (e) {
    next(e);
  }
}

export async function startQuiz(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const subjectDisplay = String(req.body.subject || '').trim();
    if (!subjectDisplay) return res.status(400).json({ message: 'Subject is required' });

    const subjectKey = normalizeSubjectKey(subjectDisplay);
    const used = await completedCountInWindow(req.userId, subjectKey);
    if (used >= QUIZ_TESTS_PER_SUBJECT_PER_WEEK) {
      return res.status(429).json({
        message: `You can take at most ${QUIZ_TESTS_PER_SUBJECT_PER_WEEK} mock tests per subject per 7-day window.`,
        usedThisWeek: used,
        maxPerWeek: QUIZ_TESTS_PER_SUBJECT_PER_WEEK,
      });
    }

    await QuizSession.deleteMany({
      userId: req.userId,
      subjectKey,
      status: 'active',
    });

    const questionCount = Number(req.body.questionCount) || 8;
    let questions = await generateQuizQuestions(subjectDisplay, subjectKey, questionCount);
    if (!Array.isArray(questions) || questions.length < 5) {
      return res.status(500).json({ message: 'Could not generate questions. Try again.' });
    }

    const session = await QuizSession.create({
      userId: req.userId,
      subjectKey,
      subjectDisplay,
      questions,
      status: 'active',
    });

    const clientQuestions = questions.map((q, index) => ({
      index,
      text: q.text,
      options: q.options,
    }));

    res.status(201).json({
      sessionId: String(session._id),
      subject: subjectDisplay,
      questionCount: questions.length,
      remainingThisWeek: Math.max(0, QUIZ_TESTS_PER_SUBJECT_PER_WEEK - used),
      usedThisWeek: used,
      questions: clientQuestions,
    });
  } catch (e) {
    next(e);
  }
}

export async function submitQuiz(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { sessionId, answers } = req.body;
    let sid;
    try {
      sid = new mongoose.Types.ObjectId(String(sessionId));
    } catch {
      return res.status(400).json({ message: 'Invalid session id' });
    }

    const session = await QuizSession.findOne({
      _id: sid,
      userId: req.userId,
      status: 'active',
    });
    if (!session) return res.status(404).json({ message: 'Session not found or already submitted' });

    const total = session.questions.length;
    if (!Array.isArray(answers) || answers.length !== total) {
      return res.status(400).json({ message: `Provide exactly ${total} answers` });
    }
    for (let i = 0; i < total; i++) {
      const a = Math.round(Number(answers[i]));
      if (!Number.isFinite(a) || !Number.isInteger(a) || a < 0 || a > 3) {
        return res.status(400).json({ message: `Invalid answer index at question ${i}` });
      }
    }

    let correct = 0;
    const breakdown = session.questions.map((q, i) => {
      const selected = Math.round(Number(answers[i]));
      const ok = selected === q.correctIndex;
      if (ok) correct += 1;
      return {
        index: i,
        text: q.text,
        options: q.options,
        yourIndex: selected,
        correctIndex: q.correctIndex,
        isCorrect: ok,
      };
    });

    const scorePercent = total ? Math.round((correct / total) * 100) : 0;

    session.status = 'completed';
    session.correctCount = correct;
    session.scorePercent = scorePercent;
    session.answersSubmitted = answers.map((a) => Math.round(Number(a)));
    session.completedAt = new Date();
    await session.save();

    res.json({
      sessionId: String(session._id),
      subject: session.subjectDisplay,
      correctCount: correct,
      totalCount: total,
      scorePercent,
      breakdown,
    });
  } catch (e) {
    next(e);
  }
}

export async function history(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const rows = await QuizSession.find({
      userId: req.userId,
      status: 'completed',
    })
      .sort({ completedAt: -1 })
      .limit(limit)
      .select('subjectDisplay subjectKey scorePercent correctCount questions completedAt createdAt');

    const list = rows.map((r) => ({
      id: r._id,
      subject: r.subjectDisplay,
      scorePercent: r.scorePercent,
      correctCount: r.correctCount,
      totalCount: r.questions?.length || 0,
      completedAt: r.completedAt,
    }));

    res.json({ results: list });
  } catch (e) {
    next(e);
  }
}

export async function profileQuizStats(req, res, next) {
  try {
    const since = new Date(Date.now() - QUIZ_WINDOW_MS);
    const completed = await QuizSession.find({
      userId: req.userId,
      status: 'completed',
    }).sort({ completedAt: -1 });

    const thisWeek = completed.filter((c) => c.completedAt && new Date(c.completedAt) >= since);
    const avg =
      completed.length && completed.reduce((s, c) => s + (c.scorePercent || 0), 0) / completed.length;

    const bySubject = {};
    for (const c of completed) {
      const k = c.subjectDisplay;
      if (!bySubject[k]) bySubject[k] = { attempts: 0, sum: 0, lastAt: null };
      bySubject[k].attempts += 1;
      bySubject[k].sum += c.scorePercent || 0;
      bySubject[k].lastAt = c.completedAt;
    }

    const subjectAverages = Object.entries(bySubject).map(([subject, v]) => ({
      subject,
      attempts: v.attempts,
      avgScore: Math.round(v.sum / v.attempts),
      lastAt: v.lastAt,
    }));

    subjectAverages.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

    res.json({
      totalCompleted: completed.length,
      completedThisWeek: thisWeek.length,
      overallAvgScore: completed.length ? Math.round(avg) : null,
      subjectAverages,
      limits: {
        maxPerSubjectPerWeek: QUIZ_TESTS_PER_SUBJECT_PER_WEEK,
        windowDays: 7,
      },
    });
  } catch (e) {
    next(e);
  }
}
