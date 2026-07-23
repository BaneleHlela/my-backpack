// Content router — all routes mounted at /api/content. No auth required.
import { Router, IRouter } from 'express';
import {
  getFieldsHandler,
  getSubjectsHandler,
  getSubjectHandler,
  getCoursesHandler,
  getCourseHandler,
  getMiniAppsHandler,
  getMiniAppHandler,
} from './content.controller';

const router: IRouter = Router();

// GET /api/content/fields
router.get('/fields', getFieldsHandler);

// GET /api/content/fields/:fieldSlug/subjects
router.get('/fields/:fieldSlug/subjects', getSubjectsHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug
router.get('/fields/:fieldSlug/subjects/:subjectSlug', getSubjectHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses
router.get('/fields/:fieldSlug/subjects/:subjectSlug/courses', getCoursesHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses/:courseSlug
router.get('/fields/:fieldSlug/subjects/:subjectSlug/courses/:courseSlug', getCourseHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps
router.get('/fields/:fieldSlug/subjects/:subjectSlug/miniapps', getMiniAppsHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps/:miniAppSlug
router.get('/fields/:fieldSlug/subjects/:subjectSlug/miniapps/:miniAppSlug', getMiniAppHandler);

export default router;
