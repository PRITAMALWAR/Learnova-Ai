import mongoose from 'mongoose';

const studyTaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weeklyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyPlan' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    startMinutes: { type: Number, default: 0 },
    endMinutes: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

studyTaskSchema.index({ userId: 1, date: 1, status: 1 });

export default mongoose.model('StudyTask', studyTaskSchema);
