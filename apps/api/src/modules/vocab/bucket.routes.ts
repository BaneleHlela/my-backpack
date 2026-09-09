import { Router, IRouter, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { requireProfile } from '../auth/auth.middleware';
import { attachContentPrefs } from '../../middleware/ageGroup.middleware';
import { AppError, catchAsync } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import * as buckets from './bucket.service';
import { objectId, pageNumber, shortText } from './bucket.validation';
import {
  previewBucketWords,
  recommendBucketWords,
} from './bucketRecommendations.service';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';

const router: IRouter = Router();
router.use(requireProfile, attachContentPrefs);
const profile = (req: Request) => req.profile!._id.toString();
const id = (req: Request) => String(req.params.bucketId);
const body = (req: Request): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    throw new AppError('Invalid request', 400);
  return req.body;
};
const miniApp = (req: Request) =>
  shortText(req.query.miniAppId, 'Dictionary', 24);
const limited = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: profile,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'You have used your word suggestions for this hour. Try again later.',
  },
});
const previewLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  keyGenerator: profile,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
router.get(
  '/',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(res, {
      buckets: await buckets.listBuckets(profile(req), miniApp(req)),
    })
  )
);
router.post(
  '/',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(
      res,
      await buckets.createBucket(
        profile(req),
        shortText(body(req).miniAppId, 'Dictionary', 24),
        body(req)
      ),
      201
    )
  )
);
router.get(
  '/discover',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(
      res,
      await buckets.discoverBuckets(
        profile(req),
        miniApp(req),
        shortText(req.query.search ?? '', 'Search', 60, false),
        pageNumber(req.query.page)
      )
    )
  )
);
router.get(
  '/quiz-options',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(
      res,
      await buckets.quizBucketOptions(
        profile(req),
        req.query.miniAppId as string | undefined,
        req.query.quizId as string | undefined,
        req.query.playModeId
      )
    )
  )
);
router.put(
  '/quiz-options',
  catchAsync(async (req: Request, res: Response) => {
    await buckets.saveQuizBuckets(
      profile(req),
      shortText(body(req).quizId, 'Quiz', 24),
      body(req).playModeId,
      body(req).bucketIds
    );
    sendSuccess(res, { saved: true });
  })
);
router.get(
  '/memberships',
  catchAsync(async (req: Request, res: Response) => {
    const owned = await buckets.listBuckets(profile(req), miniApp(req));
    const entries = await BucketEntry.find({
      profileId: profile(req),
      bucketId: { $in: owned.map((b) => b._id) },
      definitionId: objectId(req.query.definitionId, 'definition'),
    });
    sendSuccess(res, {
      buckets: owned,
      bucketIds: entries.map((e) => e.bucketId.toString()),
    });
  })
);
router.put(
  '/memberships',
  catchAsync(async (req: Request, res: Response) => {
    const data = body(req);
    await buckets.setMemberships(
      profile(req),
      shortText(data.miniAppId, 'Dictionary', 24),
      shortText(data.definitionId, 'Definition', 24),
      data.bucketIds
    );
    sendSuccess(res, { saved: true });
  })
);
router.get(
  '/:bucketId',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(
      res,
      await buckets.bucketDetail(
        profile(req),
        id(req),
        pageNumber(req.query.page),
        shortText(req.query.search ?? '', 'Search', 60, false),
        String(req.query.status ?? 'all'),
        String(req.query.sort ?? 'recent')
      )
    )
  )
);
router.patch(
  '/:bucketId',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(
      res,
      await buckets.updateBucket(profile(req), id(req), body(req))
    )
  )
);
router.delete(
  '/:bucketId',
  catchAsync(async (req: Request, res: Response) => {
    await buckets.deleteBucket(profile(req), id(req));
    sendSuccess(res, { deleted: true });
  })
);
router.post(
  '/:bucketId/copy',
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(res, await buckets.copyBucket(profile(req), id(req)), 201)
  )
);
router.post(
  '/:bucketId/entries',
  catchAsync(async (req: Request, res: Response) => {
    await buckets.addBucketDefinitions(
      profile(req),
      id(req),
      body(req).definitionIds
    );
    sendSuccess(res, { saved: true });
  })
);
router.patch(
  '/:bucketId/entries/:entryId',
  catchAsync(async (req: Request, res: Response) => {
    await buckets.setEntryPaused(
      profile(req),
      id(req),
      String(req.params.entryId),
      body(req).paused
    );
    sendSuccess(res, { saved: true });
  })
);
router.delete(
  '/:bucketId/entries/:entryId',
  catchAsync(async (req: Request, res: Response) => {
    await buckets.removeBucketEntry(
      profile(req),
      id(req),
      String(req.params.entryId)
    );
    sendSuccess(res, { removed: true });
  })
);
router.post(
  '/:bucketId/preview',
  previewLimit,
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(res, {
      previews: await previewBucketWords(
        profile(req),
        id(req),
        body(req).words
      ),
    })
  )
);
router.post(
  '/:bucketId/recommendations',
  limited,
  catchAsync(async (req: Request, res: Response) =>
    sendSuccess(
      res,
      await recommendBucketWords(
        profile(req),
        id(req),
        body(req),
        req.contentPrefs.ageGroup
      )
    )
  )
);
export default router;
