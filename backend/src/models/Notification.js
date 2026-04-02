import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    type: {
      type: String,
      enum: ['reminder', 'achievement', 'system', 'deadline'],
      default: 'reminder',
    },
    read: { type: Boolean, default: false },
    badge: { type: String, default: 'info' },
    studyTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyTask' },
    scheduledFor: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
