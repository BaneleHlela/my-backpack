// Route handlers for /api/vocab — delegates to vocab.service.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import {
  searchVocab,
  addToBucket,
  removeFromBucket,
  getBucket,
  getRecent,
  getTermDetail,
  browseByLetter,
  getAlphabet,
  getTrending,
} from './vocab.service';
import { Types } from 'mongoose';
import {
  SearchVocabQuery,
  AddToBucketDto,
  GetBucketQuery,
  DictionaryBrowseQuery,
  AlphabetQuery,
  TrendingQuery,
  RecentQuery,
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

  const { termId, definitionId, miniAppId } = req.body as Partial<AddToBucketDto>;
  if (!termId || !definitionId || !miniAppId) {
    throw new AppError('termId, definitionId, and miniAppId are required', 400);
  }
  if (!Types.ObjectId.isValid(termId)) throw new AppError('Invalid termId', 400);
  if (!Types.ObjectId.isValid(definitionId)) throw new AppError('Invalid definitionId', 400);
  if (!Types.ObjectId.isValid(miniAppId)) throw new AppError('Invalid miniAppId', 400);

  try {
    const entry = await addToBucket(profileId, termId, definitionId, miniAppId);
    sendSuccess(res, entry, 201);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err instanceof Error ? err.message : 'Failed to add to bucket', 400);
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

  const validStatuses = ['learning', 'mastered', 'paused', 'all'];
  const resolvedStatus = validStatuses.includes(status ?? '')
    ? (status as 'learning' | 'mastered' | 'paused' | 'all')
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

export const browseByLetterHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { miniAppId, letter = 'a', page = '1', limit = '20' } =
    req.query as Partial<DictionaryBrowseQuery>;
  if (!miniAppId) throw new AppError('miniAppId query parameter is required', 400);

  const normalizedLetter = (letter ?? 'a').toLowerCase();
  if (!/^[a-z]$/.test(normalizedLetter)) throw new AppError('letter must be a single a-z character', 400);

  const resolvedPage = Math.max(1, parseInt(page ?? '1', 10));
  const resolvedLimit = Math.min(50, Math.max(1, parseInt(limit ?? '20', 10)));

  const result = await browseByLetter(miniAppId, normalizedLetter, resolvedPage, resolvedLimit);
  sendSuccess(res, result);
});

export const getAlphabetHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { miniAppId } = req.query as Partial<AlphabetQuery>;
  if (!miniAppId) throw new AppError('miniAppId query parameter is required', 400);

  const result = await getAlphabet(miniAppId);
  sendSuccess(res, result);
});

export const getRecentHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const { miniAppId, limit = '10' } = req.query as Partial<RecentQuery>;
  if (!miniAppId) throw new AppError('miniAppId query parameter is required', 400);

  const resolvedLimit = Math.min(50, Math.max(1, parseInt(limit ?? '10', 10)));
  const result = await getRecent(profileId, miniAppId, resolvedLimit);
  sendSuccess(res, result);
});

export const getTrendingHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { miniAppId, limit = '10' } = req.query as Partial<TrendingQuery>;
  if (!miniAppId) throw new AppError('miniAppId query parameter is required', 400);

  const resolvedLimit = Math.min(50, Math.max(1, parseInt(limit ?? '10', 10)));

  const result = await getTrending(miniAppId, resolvedLimit);
  sendSuccess(res, result);
});
