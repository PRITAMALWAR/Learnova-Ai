import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Student' },
    examTrack: { type: String, default: '' },
    targetExamDate: { type: Date },
    hoursPerDay: { type: Number, default: 7, min: 1, max: 16 },
    studyPreference: {
      type: String,
      enum: ['morning', 'afternoon', 'night', 'flexible'],
      default: 'flexible',
    },
    studyStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
