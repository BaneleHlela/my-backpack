// Vocab router — all routes mounted at /api/vocab.
// All routes require a full JWT (requireProfile) so the ageGroup is available.
// Routes that return term content or questions also run attachContentPrefs.
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import { attachContentPrefs } from '../../middleware/ageGroup.middleware';
import {
  searchHandler,
  addToBucketHandler,
  removeFromBucketHandler,
  getBucketHandler,
  getTermDetailHandler,
} from './vocab.controller';

const router: IRouter = Router();

// GET /api/vocab/terms/:termId
router.get('/terms/:termId', requireProfile, attachContentPrefs, getTermDetailHandler);

// GET /api/vocab/search?word=ephemeral&miniAppId=xxx
router.get('/search', requireProfile, searchHandler);

// GET /api/vocab/bucket?miniAppId=xxx&status=learning&page=1&limit=20
router.get('/bucket', requireProfile, getBucketHandler);

// POST /api/vocab/bucket  { termId, miniAppId }
router.post('/bucket', requireProfile, addToBucketHandler);

// DELETE /api/vocab/bucket/:termId?miniAppId=xxx
router.delete('/bucket/:termId', requireProfile, removeFromBucketHandler);

export default router;
