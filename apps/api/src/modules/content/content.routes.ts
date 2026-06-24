// Content router — all routes mounted at /api/content. No auth required.
import { Router, IRouter } from 'express';
import {
  getSubjectsHandler,
  getTopicsHandler,
  getMiniAppsHandler,
  getMiniAppHandler,
} from './content.controller';

const router: IRouter = Router();

// GET /api/content/subjects
router.get('/subjects', getSubjectsHandler);

// GET /api/content/subjects/:slug/topics
router.get('/subjects/:slug/topics', getTopicsHandler);

// GET /api/content/topics/:slug/miniapps
router.get('/topics/:slug/miniapps', getMiniAppsHandler);

// GET /api/content/miniapps/:slug
router.get('/miniapps/:slug', getMiniAppHandler);

export default router;
