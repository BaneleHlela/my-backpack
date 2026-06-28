// Vocab router — all routes mounted at /api/vocab.
// Public routes (dictionary browsing) require no auth.
// Profile routes require a full JWT (requireProfile) so the ageGroup is available.
// Routes that return term content or questions also run attachContentPrefs.
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import { attachContentPrefs } from '../../middleware/ageGroup.middleware';
import {
  searchHandler,
  addToBucketHandler,
  removeFromBucketHandler,
  getBucketHandler,
  getRecentHandler,
  getTermDetailHandler,
  browseByLetterHandler,
  getAlphabetHandler,
  getTrendingHandler,
} from './vocab.controller';

const router: IRouter = Router();

// GET /api/vocab/dictionary/alphabet?miniAppId=xxx — public
router.get('/dictionary/alphabet', getAlphabetHandler);

// GET /api/vocab/dictionary?miniAppId=xxx&letter=a&page=1&limit=20 — public
router.get('/dictionary', browseByLetterHandler);

// GET /api/vocab/trending?miniAppId=xxx&limit=10 — public
router.get('/trending', getTrendingHandler);

// GET /api/vocab/terms/:termId
router.get('/terms/:termId', requireProfile, attachContentPrefs, getTermDetailHandler);

// GET /api/vocab/search?word=ephemeral&miniAppId=xxx
router.get('/search', requireProfile, searchHandler);

// GET /api/vocab/recent?miniAppId=xxx&limit=10
router.get('/recent', requireProfile, getRecentHandler);

// GET /api/vocab/bucket?miniAppId=xxx&status=learning&page=1&limit=20
router.get('/bucket', requireProfile, getBucketHandler);

// POST /api/vocab/bucket  { termId, miniAppId }
router.post('/bucket', requireProfile, addToBucketHandler);

// DELETE /api/vocab/bucket/:termId?miniAppId=xxx
router.delete('/bucket/:termId', requireProfile, removeFromBucketHandler);

export default router;
