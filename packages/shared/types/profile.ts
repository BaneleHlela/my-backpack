// IProfile interface — mirrors the Profile Mongoose model, used across apps
export type AgeGroup = 'child' | 'teen' | 'adult';

export type EducationLevel =
  | 'grade-r'
  | 'grade-1'
  | 'grade-2'
  | 'grade-3'
  | 'grade-4'
  | 'grade-5'
  | 'grade-6'
  | 'grade-7'
  | 'grade-8'
  | 'grade-9'
  | 'grade-10'
  | 'grade-11'
  | 'grade-12'
  | 'certificate'
  | 'diploma'
  | 'bachelors'
  | 'honours'
  | 'masters'
  | 'phd'
  | 'professional'
  | 'other';

export interface IEducationResult {
  subject: string;
  grade: string;
  year: number;
  level: string;
}

export interface IEducation {
  currentLevel?: EducationLevel;
  institution?: string;
  results: IEducationResult[];
}

export interface IPreferences {
  language: string;
  theme: 'light' | 'dark';
}

export interface IProfile {
  _id: string;
  accountId: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: AgeGroup;
  dateOfBirth?: string;
  isOwner: boolean;
  isSetupComplete: boolean;
  education: IEducation;
  preferences: IPreferences;
  progress: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IProfileSummary {
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
