import StudyTask from '../models/StudyTask.js';

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base, n) {
  const x = new Date(base);
  x.setDate(x.getDate() + n);
  return x;
}

/** Map JS getDay() (0=Sun) to plan dayOfWeek if plan uses 1=Mon..6=Sat, 0=Sun */
function dateForPlanDay(weekStartMonday, planDay) {
  if (planDay === 0) return addDays(weekStartMonday, 6);
  return addDays(weekStartMonday, planDay - 1);
}

export async function syncTasksForPlan(userId, weeklyPlan) {
  const weekStart = startOfWeekMonday(weeklyPlan.weekStart);
  const existing = await StudyTask.find({
    userId,
    weeklyPlanId: weeklyPlan._id,
  });
  if (existing.length) return existing;

  const tasks = [];
  for (const slot of weeklyPlan.slots) {
    if (slot.category === 'break') continue;
    const date = dateForPlanDay(weekStart, slot.dayOfWeek);
    tasks.push({
      userId,
      weeklyPlanId: weeklyPlan._id,
      title: `${slot.title}`,
      detail: `${slot.hourLabel}`,
      date,
      status: 'pending',
      progress: 0,
    });
  }
  if (tasks.length) await StudyTask.insertMany(tasks);
  return StudyTask.find({ userId, weeklyPlanId: weeklyPlan._id });
}
