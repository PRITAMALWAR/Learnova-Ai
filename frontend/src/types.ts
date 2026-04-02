export type User = {
  id: string;
  email: string;
  name: string;
  examTrack?: string;
  targetExamDate?: string;
  hoursPerDay?: number;
  studyPreference?: string;
  studyStreak?: number;
};

export type Subject = {
  _id: string;
  name: string;
  isWeak: boolean;
  colorKey?: string;
};

export type PlanSlot = {
  dayOfWeek: number;
  hourLabel: string;
  title: string;
  category?: string;
  colorToken?: string;
};

export type WeeklyPlan = {
  _id: string;
  weekStart: string;
  weekEnd: string;
  label?: string;
  slots: PlanSlot[];
};

export type StudyTask = {
  _id: string;
  title: string;
  detail?: string;
  date: string;
  status: string;
  progress: number;
};

export type NotificationItem = {
  _id: string;
  title: string;
  body?: string;
  read: boolean;
  badge?: string;
  type?: string;
  createdAt: string;
};
