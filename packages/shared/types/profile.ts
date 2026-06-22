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
  education: IEducation;
  preferences: IPreferences;
  progress: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
