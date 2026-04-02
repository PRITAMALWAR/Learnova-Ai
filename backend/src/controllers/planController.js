import { validationResult } from 'express-validator';
import WeeklyPlan from '../models/WeeklyPlan.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import { generateWeeklyPlanPayload } from '../services/openaiPlan.js';
import { syncTasksForPlan } from '../services/tasksFromPlan.js';
import { buildTimetablePdfBuffer } from '../services/pdfTimetable.js';

function startOfWeekMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(monday) {
  const x = new Date(monday);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function generate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      subjectNames,
      weakSubjectNames,
      hoursPerDay,
      examDate,
      studyPreferenceLabel,
      targetScore,
      breakStyle,
      additionalNotes,
    } = req.body;

    const user = await User.findById(req.userId);
    const subs = Array.isArray(subjectNames) ? subjectNames : [];
    const weak = Array.isArray(weakSubjectNames) ? weakSubjectNames : [];

    const payload = await generateWeeklyPlanPayload({
      subjects: subs,
      weakSubjects: weak,
      hoursPerDay: hoursPerDay ?? user?.hoursPerDay ?? 7,
      examDate: examDate || user?.targetExamDate,
      studyPreference: studyPreferenceLabel || user?.studyPreference || 'flexible',
      targetScore,
      breakStyle,
      additionalNotes,
    });

    const weekStart = startOfWeekMonday();
    const weekEnd = endOfWeekSunday(weekStart);

    const plan = await WeeklyPlan.create({
      userId: req.userId,
      weekStart,
      weekEnd,
      label: payload.weekLabel,
      slots: payload.slots,
      meta: { targetScore, breakStyle, additionalNotes },
    });

    await syncTasksForPlan(req.userId, plan);

    const populated = await WeeklyPlan.findById(plan._id);
    res.status(201).json({
      plan: populated,
      planSource: payload.source === 'openai' ? 'openai' : 'template',
    });
  } catch (e) {
    next(e);
  }
}

export async function latest(req, res, next) {
  try {
    const plan = await WeeklyPlan.findOne({ userId: req.userId }).sort({ weekStart: -1 });
    res.json({ plan });
  } catch (e) {
    next(e);
  }
}

export async function pdf(req, res, next) {
  try {
    const plan = await WeeklyPlan.findOne({ userId: req.userId, _id: req.params.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const buf = await buildTimetablePdfBuffer({
      title: 'AI Study Planner — Timetable',
      weekLabel: plan.label || `${plan.weekStart?.toDateString?.()} – ${plan.weekEnd?.toDateString?.()}`,
      slots: plan.slots,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="timetable.pdf"');
    res.send(buf);
  } catch (e) {
    next(e);
  }
}

export async function weakInsight(req, res, next) {
  try {
    const weak = await Subject.find({ userId: req.userId, isWeak: true });
    const all = await Subject.find({ userId: req.userId });
    const names = weak.map((s) => s.name).join(', ') || 'No weak subjects tagged yet';
    res.json({
      summary: `Focus extra time on: ${names}. You have ${all.length} subjects tracked.`,
      weakSubjects: weak,
    });
  } catch (e) {
    next(e);
  }
}
