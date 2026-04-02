import mongoose from 'mongoose';

const taskHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studyTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyTask' },
    action: { type: String, enum: ['completed', 'updated', 'created'], required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

taskHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('TaskHistory', taskHistorySchema);
