import { validationResult } from 'express-validator';
import StudyTask from '../models/StudyTask.js';
import TaskHistory from '../models/TaskHistory.js';
import { bumpStreakOnActivity } from '../services/streak.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function today(req, res, next) {
  try {
    const now = new Date();
    const tasks = await StudyTask.find({
      userId: req.userId,
      date: { $gte: startOfDay(now), $lte: endOfDay(now) },
    }).sort({ startMinutes: 1 });

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'completed').length;
    res.json({
      tasks,
      stats: {
        total,
        completed: done,
        percent: total ? Math.round((done / total) * 100) : 0,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function range(req, res, next) {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date();
    from.setDate(from.getDate() - 30);
    const tasks = await StudyTask.find({
      userId: req.userId,
      updatedAt: { $gte: from },
    })
      .sort({ date: -1 })
      .limit(500);
    res.json({ tasks });
  } catch (e) {
    next(e);
  }
}

export async function updateTask(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const task = await StudyTask.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ message: 'Not found' });

    const { status, progress } = req.body;
    if (progress !== undefined) task.progress = Math.min(100, Math.max(0, progress));
    if (status !== undefined) {
      task.status = status;
      if (status === 'completed') {
        task.progress = 100;
        task.completedAt = new Date();
        await bumpStreakOnActivity(req.userId);
      }
    }
    await task.save();

    await TaskHistory.create({
      userId: req.userId,
      studyTaskId: task._id,
      action: status === 'completed' ? 'completed' : 'updated',
      snapshot: task.toObject(),
    });

    res.json({ task });
  } catch (e) {
    next(e);
  }
}

export async function analytics(req, res, next) {
  try {
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const tasks = await StudyTask.find({
      userId: req.userId,
      createdAt: { $gte: from },
    });

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;

    const bySubject = {};
    for (const t of tasks) {
      const key = t.title.split(' ')[0] || 'General';
      if (!bySubject[key]) bySubject[key] = { done: 0, total: 0 };
      bySubject[key].total += 1;
      if (t.status === 'completed') bySubject[key].done += 1;
    }

    res.json({
      windowDays: 30,
      completed,
      pending,
      total: tasks.length,
      bySubject,
    });
  } catch (e) {
    next(e);
  }
}
