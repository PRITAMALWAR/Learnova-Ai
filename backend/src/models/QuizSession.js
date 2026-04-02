import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false }
);

const quizSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectKey: { type: String, required: true, index: true },
    subjectDisplay: { type: String, required: true },
    questions: { type: [questionSchema], required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
    scorePercent: { type: Number },
    correctCount: { type: Number },
    answersSubmitted: [{ type: Number }],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

quizSessionSchema.index({ userId: 1, subjectKey: 1, status: 1 });
quizSessionSchema.index({ userId: 1, completedAt: -1 });

export const QUIZ_TESTS_PER_SUBJECT_PER_WEEK = 2;
export const QUIZ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeSubjectKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export default mongoose.model('QuizSession', quizSessionSchema);
