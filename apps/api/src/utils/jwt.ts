// JWT signing and verification for partial tokens, full tokens, and refresh tokens
import jwt from 'jsonwebtoken';
import { AgeGroup } from '../models/core/profile.model';

export interface PartialTokenPayload {
  accountId: string;
}

export interface FullTokenPayload {
  accountId: string;
  profileId: string;
  ageGroup: AgeGroup;
}

export interface RefreshTokenPayload {
  accountId: string;
}

function accessSecret(): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error('ACCESS_TOKEN_SECRET is not defined');
  return secret;
}

function refreshSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not defined');
  return secret;
}

export function signPartialToken(payload: PartialTokenPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: '5m' });
}

export function signFullToken(payload: FullTokenPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: process.env.NODE_ENV === 'production' ? '15m' : '1d' });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, refreshSecret(), { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): PartialTokenPayload | FullTokenPayload {
  return jwt.verify(token, accessSecret()) as PartialTokenPayload | FullTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret()) as RefreshTokenPayload;
}
