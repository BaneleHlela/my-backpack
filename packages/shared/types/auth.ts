// Request and response types for all auth API endpoints
import { AgeGroup } from './profile';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Shown in the profile selector after login
export interface ProfileSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: AgeGroup;
  isOwner: boolean;
  isSetupComplete: boolean;
  hasPin?: boolean;
}

// POST /api/auth/register
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  ageGroup: AgeGroup;
}

export interface RegisterResponse {
  email: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// POST /api/auth/login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  partialToken: string;
  profiles: ProfileSummary[];
  refreshToken?: string; // present only when X-Client-Type: mobile was sent
}

// POST /api/auth/select-profile
export interface SelectProfileRequest {
  profileId: string;
  pin?: string;
}

export interface SelectProfileResponse {
  accessToken: string;
}
