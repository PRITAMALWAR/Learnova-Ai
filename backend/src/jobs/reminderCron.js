import cron from 'node-cron';
import StudyTask from '../models/StudyTask.js';
import Notification from '../models/Notification.js';

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

export function startReminderCron() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);

      const tasks = await StudyTask.find({
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'in_progress'] },
      }).limit(500);

      for (const t of tasks) {
        const exists = await Notification.findOne({
          userId: t.userId,
          studyTaskId: t._id,
          title: { $regex: /starts soon/i },
          createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
        });
        if (exists) continue;

        const pseudoStart = new Date(dayStart);
        const h = (t.detail || '').match(/(\d{1,2})\s*(AM|PM)/i);
        if (h) {
          let hour = parseInt(h[1], 10);
          const ap = h[2].toUpperCase();
          if (ap === 'PM' && hour < 12) hour += 12;
          if (ap === 'AM' && hour === 12) hour = 0;
          pseudoStart.setHours(hour, 0, 0, 0);
        }

        if (pseudoStart >= now && pseudoStart <= windowEnd) {
          await Notification.create({
            userId: t.userId,
            title: `${t.title} session starts soon`,
            body: t.detail || 'Check your timetable',
            type: 'reminder',
            badge: 'purple',
            studyTaskId: t._id,
            scheduledFor: pseudoStart,
          });
        }
      }
    } catch (e) {
      console.error('reminderCron', e.message);
    }
  });
}
