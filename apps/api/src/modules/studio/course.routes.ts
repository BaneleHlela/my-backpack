// Course router — mounted at /api/dashboard/courses. Platform-admin only.
import { Router, IRouter } from 'express';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import {
  createCourseHandler,
  updateCourseHandler,
  deleteCourseHandler,
  suggestStructureHandler,
  applyBookChaptersHandler,
} from './course.controller';
import { createNodeHandler, reorderNodesHandler } from './node.controller';

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// POST /api/dashboard/courses
router.post('/', createCourseHandler);

// PATCH /api/dashboard/courses/:courseId
router.patch('/:courseId', updateCourseHandler);

// DELETE /api/dashboard/courses/:courseId
router.delete('/:courseId', deleteCourseHandler);

// POST /api/dashboard/courses/:courseId/nodes
router.post('/:courseId/nodes', createNodeHandler);

// PATCH /api/dashboard/courses/:courseId/nodes/reorder
router.patch('/:courseId/nodes/reorder', reorderNodesHandler);

// POST /api/dashboard/courses/:courseId/suggest-structure — book-to-course pipeline, Phase 2
router.post('/:courseId/suggest-structure', suggestStructureHandler);

// POST /api/dashboard/courses/:courseId/book-chapters — book-to-course pipeline, Phase 3
router.post('/:courseId/book-chapters', applyBookChaptersHandler);

export default router;
