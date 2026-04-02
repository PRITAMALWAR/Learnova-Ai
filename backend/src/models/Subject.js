import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    isWeak: { type: Boolean, default: false },
    colorKey: {
      type: String,
      enum: ['math', 'physics', 'chemistry', 'bio', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

subjectSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);
