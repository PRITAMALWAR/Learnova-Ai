import { validationResult } from 'express-validator';
import User from '../models/User.js';

const prefMap = {
  'Morning Person (6AM–2PM)': 'morning',
  'Afternoon (12PM–8PM)': 'afternoon',
  'Night Owl (6PM–12AM)': 'night',
  Flexible: 'flexible',
};

export async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, examTrack, targetExamDate, hoursPerDay, studyPreference } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (examTrack !== undefined) user.examTrack = examTrack;
    if (targetExamDate !== undefined) user.targetExamDate = targetExamDate ? new Date(targetExamDate) : null;
    if (hoursPerDay !== undefined) user.hoursPerDay = hoursPerDay;
    if (studyPreference !== undefined) {
      user.studyPreference = prefMap[studyPreference] || studyPreference;
    }

    await user.save();
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        examTrack: user.examTrack,
        targetExamDate: user.targetExamDate,
        hoursPerDay: user.hoursPerDay,
        studyPreference: user.studyPreference,
        studyStreak: user.studyStreak,
      },
    });
  } catch (e) {
    next(e);
  }
}
