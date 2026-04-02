import User from '../models/User.js';

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(d, ref) {
  const y = new Date(ref);
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
}

export async function bumpStreakOnActivity(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  const now = new Date();
  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;

  if (!last) {
    user.studyStreak = 1;
  } else if (isSameDay(last, now)) {
    /* same day — keep streak */
  } else if (isYesterday(last, now)) {
    user.studyStreak = (user.studyStreak || 0) + 1;
  } else {
    user.studyStreak = 1;
  }

  user.lastActiveDate = now;
  await user.save();
}
