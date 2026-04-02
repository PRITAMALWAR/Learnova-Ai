import Notification from '../models/Notification.js';

export async function list(req, res, next) {
  try {
    const items = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    const unread = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ notifications: items, unreadCount: unread });
  } catch (e) {
    next(e);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.userId }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function markOneRead(req, res, next) {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json({ notification: n });
  } catch (e) {
    next(e);
  }
}

export async function seedDemo(req, res, next) {
  try {
    const samples = [
      {
        title: 'Physics session starts in 30 min',
        body: 'Mechanics — check your timetable',
        type: 'reminder',
        badge: 'purple',
      },
      {
        title: 'Math session completed',
        body: 'Great work — streak updated',
        type: 'achievement',
        badge: 'green',
      },
    ];
    for (const s of samples) {
      await Notification.create({ userId: req.userId, ...s });
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}
