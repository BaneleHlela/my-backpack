// Shared types for subject enrollment.
// Mirrors profileSubjectEnrollment.model.ts.
import { IField, ISubject } from './content';

export type EnrollmentStatus = 'active' | 'paused' | 'completed';

export interface IProgressSummary {
  totalNodes: number;
  completedNodes: number;
  totalLessons: number;
  completedLessons: number;
  overallProgressPercent: number;
  lastActivityAt?: string;
}

export interface IProfileSubjectEnrollment {
  _id: string;
  profileId: string;
  subjectId: string;
  fieldId: string;
  enrolledAt: string;
  lastAccessedAt?: string;
  status: EnrollmentStatus;
  progressSummary: IProgressSummary;
}

export interface EnrolledSubjectsResponse {
  fields: {
    field: Pick<IField, '_id' | 'name' | 'slug'>;
    subjects: {
      enrollment: IProfileSubjectEnrollment;
      subject: Pick<ISubject, '_id' | 'name' | 'slug' | 'description' | 'iconUrl'>;
    }[];
  }[];
}

export interface AvailableSubject {
  subject: ISubject;
  field: IField;
  isEnrolled: boolean;
  enrolledAt?: string;
}

export interface AvailableSubjectsResponse {
  subjects: AvailableSubject[];
}
