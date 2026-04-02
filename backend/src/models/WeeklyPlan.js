import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    hourLabel: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, default: 'study' },
    colorToken: { type: String, default: 'blue' },
  },
  { _id: false }
);

const weeklyPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    label: { type: String, default: '' },
    slots: [slotSchema],
    notes: { type: String, default: '' },
    meta: {
      targetScore: Number,
      breakStyle: String,
      additionalNotes: String,
    },
  },
  { timestamps: true }
);

weeklyPlanSchema.index({ userId: 1, weekStart: -1 });

export default mongoose.model('WeeklyPlan', weeklyPlanSchema);
