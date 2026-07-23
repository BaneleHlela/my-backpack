// Course router — mounted at /api/dashboard/courses. Platform-admin only.
import { Router, IRouter } from 'express';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import { createCourseHandler, updateCourseHandler, deleteCourseHandler } from './course.controller';
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

export default router;
