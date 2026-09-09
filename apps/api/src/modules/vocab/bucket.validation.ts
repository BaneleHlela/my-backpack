import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';

export function objectId(value: unknown, label = 'id'): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
    throw new AppError('Invalid ' + label, 400);
  return new Types.ObjectId(value).toString();
}
export function idList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new AppError('Choose up to 100 buckets', 400);
  return [...new Set(value.map((id) => objectId(id, 'bucketId')))];
}
export function shortText(
  value: unknown,
  label: string,
  max: number,
  required = true
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  ) {
    throw new AppError(
      label +
        ' must contain ' +
        (required ? '1' : '0') +
        '–' +
        max +
        ' characters',
      400
    );
  }
  return value.trim();
}
export function pageNumber(value: unknown): number {
  const n = Number(value ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > 10000)
    throw new AppError('Invalid page', 400);
  return n;
}
export function playMode(value: unknown): string {
  const mode = value ?? 'classic';
  if (
    typeof mode !== 'string' ||
    ![
      'classic',
      'hearts',
      'time_run',
      'streak',
      'perfect',
      'endless',
      'survival',
      'mastery',
    ].includes(mode)
  ) {
    throw new AppError('Invalid quiz mode', 400);
  }
  return mode;
}
export function bucketFields(data: Record<string, unknown>, creating = false) {
  const result: {
    name?: string;
    description?: string;
    color?: string;
    visibility?: 'private' | 'public';
    includeInQuiz?: boolean;
  } = {};
  if (creating || data.name !== undefined)
    result.name = shortText(data.name, 'Name', 60);
  if (data.description !== undefined)
    result.description = shortText(data.description, 'Description', 240, false);
  if (data.color !== undefined) {
    if (typeof data.color !== 'string' || !/^#[a-f\d]{6}$/i.test(data.color))
      throw new AppError('Invalid bucket colour', 400);
    result.color = data.color;
  }
  if (data.visibility !== undefined) {
    if (data.visibility !== 'private' && data.visibility !== 'public')
      throw new AppError('Invalid visibility', 400);
    result.visibility = data.visibility;
  }
  if (data.includeInQuiz !== undefined) {
    if (typeof data.includeInQuiz !== 'boolean')
      throw new AppError('Invalid quiz inclusion', 400);
    result.includeInQuiz = data.includeInQuiz;
  }
  return result;
}
