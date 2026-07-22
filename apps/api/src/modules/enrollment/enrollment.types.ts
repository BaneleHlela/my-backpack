// Request/response types for the enrollment module.
import { Document } from 'mongoose';
import { IProfileSubjectEnrollmentDocument } from '../../models/learning/profileSubjectEnrollment.model';
import { ISubjectDocument } from '../../models/core/subject.model';
import { ICourseDocument } from '../../models/core/course.model';
import { IMiniAppDocument } from '../../models/core/miniApp.model';

// Mongoose find() returns Document & IProfileSubjectEnrollmentDocument — use a loose type here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEnrollmentDoc = Document & IProfileSubjectEnrollmentDocument & Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySubjectDoc = Document & ISubjectDocument & Record<string, any>;

export interface EnrolledSubjectEntry {
  enrollment: AnyEnrollmentDoc;
  subject: AnySubjectDoc;
}

export interface EnrolledSubjectsByField {
  fields: {
    field: { _id: string; name: string; slug: string };
    subjects: EnrolledSubjectEntry[];
  }[];
}

export interface SubjectProgressResult {
  enrollment: IProfileSubjectEnrollmentDocument;
  courses: { course: ICourseDocument; roadmapId: string }[];
  miniApps: IMiniAppDocument[];
}
