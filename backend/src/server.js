import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import planRoutes from './routes/planRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import { startReminderCron } from './jobs/reminderCron.js';

const app = express();

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const envOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigins = [...new Set([...defaultDevOrigins, ...envOrigins])];

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

/** Public: one-call sanity check (no JWT). */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ai-study-planner-api',
    time: new Date().toISOString(),
    port: Number(process.env.PORT) || 5000,
    openaiKeySet: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
  });
});

/** Public: verify quiz routes are mounted (no JWT). */
app.get('/api/quizzes/health', (_req, res) =>
  res.json({ ok: true, quizzes: true, path: '/api/quizzes' })
);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quizzes', quizRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

const port = Number(process.env.PORT) || 5000;

connectDb()
  .then(() => {
    startReminderCron();
    const srv = app.listen(port, () => {
      console.log(`API http://localhost:${port}`);
      console.log('Quizzes: GET /api/quizzes/health · /api/quizzes/* (JWT)');
    });
    srv.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `\nPort ${port} is already in use. Either:\n` +
            `  1) Stop the other process:  fuser -k ${port}/tcp   (Linux)\n` +
            `  2) Or set PORT=5001 in backend/.env and VITE_PROXY_TARGET=http://127.0.0.1:5001 in frontend/.env\n`
        );
      }
      throw err;
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
