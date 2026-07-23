// Express app entry point — wires up all middleware, routes, and connects to DB
import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { AppError } from './utils/AppError';

import { connectDB } from './config/db';
import { configurePassport } from './config/passport';
import authRouter from './modules/auth/auth.routes';
import profileRouter from './modules/profile/profile.routes';
import vocabRouter from './modules/vocab/vocab.routes';
import quizRouter from './modules/quiz/quiz.routes';
import contentRouter from './modules/content/content.routes';
import adminRouter from './modules/admin/admin.routes';
import roadmapRouter from './modules/roadmap/roadmap.routes';
import enrollmentRouter from './modules/enrollment/enrollment.routes';
import assetRouter from './modules/asset/asset.routes';
import studioCourseRouter from './modules/studio/course.routes';
import studioNodeRouter from './modules/studio/node.routes';
import studioLessonRouter from './modules/studio/lesson.routes';
import studioQuizRouter from './modules/studio/quiz.routes';
import studioQuestionRouter from './modules/studio/question.routes';

const app: Application = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);

// Parsing
app.use(express.json());
app.use(cookieParser());

// Passport (no sessions — JWT only)
configurePassport();
app.use(passport.initialize());

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/profiles', profileRouter);
app.use('/api/vocab', vocabRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/roadmap', roadmapRouter);
app.use('/api/enrollment', enrollmentRouter);
app.use('/api/dashboard/assets', assetRouter);
app.use('/api/dashboard/courses', studioCourseRouter);
app.use('/api/dashboard/nodes', studioNodeRouter);
app.use('/api/dashboard/lessons', studioLessonRouter);
app.use('/api/dashboard/quizzes', studioQuizRouter);
app.use('/api/dashboard/questions', studioQuestionRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler — must be the last middleware registered
app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = parseInt(process.env.PORT ?? '5000', 10);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;
