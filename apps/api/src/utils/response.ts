// Helpers for sending consistent API responses
import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200
): Response {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400
): Response {
  return res.status(statusCode).json({ success: false, message });
}
