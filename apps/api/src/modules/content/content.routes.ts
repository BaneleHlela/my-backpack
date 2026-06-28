// Content router — all routes mounted at /api/content. No auth required.
import { Router, IRouter } from 'express';
import {
  getFieldsHandler,
  getSubjectsHandler,
  getTopicsHandler,
  getMiniAppsHandler,
  getMiniAppHandler,
} from './content.controller';

const router: IRouter = Router();

// GET /api/content/fields
router.get('/fields', getFieldsHandler);

// GET /api/content/fields/:fieldSlug/subjects
router.get('/fields/:fieldSlug/subjects', getSubjectsHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics
router.get('/fields/:fieldSlug/subjects/:subjectSlug/topics', getTopicsHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics/:topicSlug/miniapps
router.get('/fields/:fieldSlug/subjects/:subjectSlug/topics/:topicSlug/miniapps', getMiniAppsHandler);

// GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics/:topicSlug/miniapps/:miniAppSlug
router.get('/fields/:fieldSlug/subjects/:subjectSlug/topics/:topicSlug/miniapps/:miniAppSlug', getMiniAppHandler);

export default router;
