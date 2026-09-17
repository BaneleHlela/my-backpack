import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import { getXpSummaryHandler } from './xp.controller';
const router: IRouter = Router();
router.get('/', requireProfile, getXpSummaryHandler);
export default router;
