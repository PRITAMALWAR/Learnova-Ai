import { validationResult } from 'express-validator';
import Subject from '../models/Subject.js';

export async function list(req, res, next) {
  try {
    const items = await Subject.find({ userId: req.userId }).sort({ name: 1 });
    res.json({ subjects: items });
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, isWeak, colorKey } = req.body;
    const sub = await Subject.create({
      userId: req.userId,
      name: name.trim(),
      isWeak: !!isWeak,
      colorKey: colorKey || 'other',
    });
    res.status(201).json({ subject: sub });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Subject already exists' });
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const sub = await Subject.findOne({ _id: req.params.id, userId: req.userId });
    if (!sub) return res.status(404).json({ message: 'Not found' });

    const { name, isWeak, colorKey } = req.body;
    if (name !== undefined) sub.name = name.trim();
    if (isWeak !== undefined) sub.isWeak = !!isWeak;
    if (colorKey !== undefined) sub.colorKey = colorKey;
    await sub.save();
    res.json({ subject: sub });
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const r = await Subject.deleteOne({ _id: req.params.id, userId: req.userId });
    if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
