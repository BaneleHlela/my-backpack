// Route handlers for /api/vocab — delegates to vocab.service.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import {
  searchVocab,
  addToBucket,
  removeFromBucket,
  getBucket,
  getTermDetail,
} from './vocab.service';
import {
  SearchVocabQuery,
  AddToBucketDto,
  GetBucketQuery,
} from './vocab.types';

export const searchHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const { word, miniAppId } = req.query as Partial<SearchVocabQuery>;
  if (!word || !miniAppId) throw new AppError('word and miniAppId query parameters are required', 400);

  try {
    const result = await searchVocab(word, miniAppId, profileId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    const status = message.startsWith('Word not found') ? 404 : 500;
    throw new AppError(message, status);
  }
});

export const addToBucketHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const { termId, miniAppId } = req.body as Partial<AddToBucketDto>;
  if (!termId || !miniAppId) throw new AppError('termId and miniAppId are required', 400);

  try {
    const entry = await addToBucket(profileId, termId, miniAppId);
    sendSuccess(res, entry, 201);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to add term to bucket', 400);
  }
});

export const removeFromBucketHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const termId = req.params['termId'] as string;
  const { miniAppId } = req.query as { miniAppId?: string };
  if (!miniAppId) throw new AppError('miniAppId query parameter is required', 400);

  try {
    await removeFromBucket(profileId, termId, miniAppId);
    sendSuccess(res, { message: 'Term removed from bucket' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to remove term from bucket', 400);
  }
});

export const getTermDetailHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const termId = req.params['termId'] as string;

  try {
    const result = await getTermDetail(termId, profileId, req.contentPrefs);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch term';
    const status = message === 'Term not found' ? 404 : 500;
    throw new AppError(message, status);
  }
});

export const getBucketHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const { miniAppId, status = 'all', page = '1', limit = '20' } =
    req.query as Partial<GetBucketQuery>;
  if (!miniAppId) throw new AppError('miniAppId query parameter is required', 400);

  const validStatuses = ['learning', 'mastered', 'all'];
  const resolvedStatus = validStatuses.includes(status ?? '')
    ? (status as 'learning' | 'mastered' | 'all')
    : 'all';
  const resolvedPage = Math.max(1, parseInt(page ?? '1', 10));
  const resolvedLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10)));

  try {
    const result = await getBucket(profileId, miniAppId, resolvedStatus, resolvedPage, resolvedLimit);
    sendSuccess(res, result);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to fetch bucket', 500);
  }
});
