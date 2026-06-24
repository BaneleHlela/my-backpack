// DTO types for the profile module — mirrored to packages/shared/types/profile.ts
import { AgeGroup, EducationLevel } from '../../models/core/profile.model';

export interface ProfileSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: AgeGroup;
  isOwner: boolean;
  isSetupComplete: boolean;
  hasPin: boolean;
}

export interface CreateProfileDto {
  displayName: string;
  ageGroup: AgeGroup;
  dateOfBirth?: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  preferences?: {
    language?: string;
    theme?: 'light' | 'dark';
  };
}

export interface ProfileSetupDto {
  dateOfBirth: string;
  education: {
    currentLevel: EducationLevel;
    institution?: string;
  };
  preferences?: {
    language?: string;
    theme?: 'light' | 'dark';
  };
}
