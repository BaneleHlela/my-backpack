// Enrollment router — all routes mounted at /api/enrollment.
// All routes require a full JWT (requireProfile).
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import {
  getEnrolledSubjectsHandler,
  getAvailableSubjectsHandler,
  enrollHandler,
  unenrollHandler,
  getSubjectProgressHandler,
  getEnrolledSubjectsByFieldHandler,
  touchAccessHandler,
} from './enrollment.controller';

const router: IRouter = Router();

// GET /api/enrollment/subjects — enrolled subjects grouped by field (dashboard)
router.get('/subjects', requireProfile, getEnrolledSubjectsHandler);

// GET /api/enrollment/subjects/available?fieldSlug= — all subjects with enrollment flag
router.get('/subjects/available', requireProfile, getAvailableSubjectsHandler);

// POST /api/enrollment/subjects — enroll in a subject { subjectId }
router.post('/subjects', requireProfile, enrollHandler);

// DELETE /api/enrollment/subjects/:subjectId — pause enrollment (preserve progress)
router.delete('/subjects/:subjectId', requireProfile, unenrollHandler);

// GET /api/enrollment/subjects/:subjectId/progress — full subject progress
router.get('/subjects/:subjectId/progress', requireProfile, getSubjectProgressHandler);

// GET /api/enrollment/fields/:fieldSlug/subjects — enrollments within a field
router.get('/fields/:fieldSlug/subjects', requireProfile, getEnrolledSubjectsByFieldHandler);

// PATCH /api/enrollment/subjects/:subjectId/accessed — touch lastAccessedAt
router.patch('/subjects/:subjectId/accessed', requireProfile, touchAccessHandler);

export default router;
