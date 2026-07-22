// Business logic for subject enrollment: enroll, unenroll, progress queries.
// A subject can now have multiple Courses (each wrapping its own Roadmap) — progressSummary
// on ProfileSubjectEnrollment is a rollup across all of the subject's courses.
import { Types } from 'mongoose';
import ProfileSubjectEnrollment, {
  IProfileSubjectEnrollmentDocument,
} from '../../models/learning/profileSubjectEnrollment.model';
import ProfileRoadmapProgress, {
  INodeProgressEntry,
  IItemProgressEntry,
} from '../../models/learning/profileRoadmapProgress.model';
import Roadmap from '../../models/learning/roadmap.model';
import RoadmapNode from '../../models/learning/roadmapNode.model';
import Course from '../../models/core/course.model';
import Subject, { ISubjectDocument } from '../../models/core/subject.model';
import Field, { IFieldDocument } from '../../models/core/field.model';
import MiniApp from '../../models/core/miniApp.model';
import { AppError } from '../../utils/AppError';
import {
  EnrolledSubjectsByField,
  SubjectProgressResult,
  EnrolledSubjectEntry,
} from './enrollment.types';

// Enroll a profile in a subject. Bootstraps roadmap progress for every Course under the subject.
export async function enrollInSubject(
  profileId: string,
  subjectId: string
): Promise<IProfileSubjectEnrollmentDocument> {
  const existing = await ProfileSubjectEnrollment.findOne({ profileId, subjectId });
  if (existing) throw new AppError('Already enrolled in this subject', 409);

  const subject = await Subject.findById(subjectId);
  if (!subject || !subject.isActive) throw new AppError('Subject not found', 404);

  const enrollment = await ProfileSubjectEnrollment.create({
    profileId: new Types.ObjectId(profileId),
    subjectId: new Types.ObjectId(subjectId),
    fieldId: subject.fieldId,
  });

  const courses = await Course.find({ subjectId, isActive: true });

  let totalNodes = 0;
  let totalItems = 0;

  for (const course of courses) {
    const roadmap = await Roadmap.findById(course.roadmapId);
    if (!roadmap) continue;

    totalNodes += roadmap.nodes.length;

    const allNodes = await RoadmapNode.find({ roadmapId: roadmap._id, isActive: true });
    totalItems += allNodes.reduce((sum, n) => sum + n.items.length, 0);

    // Already bootstrapped (e.g. re-enrolling after a pause) — don't reset progress.
    const existingProgress = await ProfileRoadmapProgress.findOne({ profileId, roadmapId: roadmap._id });
    if (existingProgress) continue;

    const sortedNodeRefs = roadmap.nodes.slice().sort((a, b) => a.position - b.position);
    const firstNodeRef = sortedNodeRefs[0];
    const nodeProgress = new Map<string, INodeProgressEntry>();

    if (firstNodeRef) {
      const firstNode = await RoadmapNode.findById(firstNodeRef.nodeId);
      if (firstNode) {
        const sortedItems = firstNode.items.slice().sort((a, b) => a.position - b.position);
        const itemProgress = new Map<string, IItemProgressEntry>();
        sortedItems.forEach((ir, idx) => {
          itemProgress.set(ir.itemId.toString(), {
            status: idx === 0 ? 'unlocked' : 'locked',
            attempts: 0,
            bestScore: 0,
          });
        });

        nodeProgress.set(firstNode._id.toString(), {
          status: 'unlocked',
          stars: 0,
          attempts: 0,
          bestScore: 0,
          itemProgress,
        });
      }
    }

    await ProfileRoadmapProgress.create({
      profileId: new Types.ObjectId(profileId),
      roadmapId: roadmap._id,
      nodeProgress,
    });
  }

  enrollment.progressSummary.totalNodes = totalNodes;
  enrollment.progressSummary.totalItems = totalItems;
  enrollment.markModified('progressSummary');
  await enrollment.save();

  return enrollment;
}

// Returns all active enrollments grouped by field, with subject info fetched separately.
export async function getEnrolledSubjects(profileId: string): Promise<EnrolledSubjectsByField> {
  const enrollments = await ProfileSubjectEnrollment.find({ profileId, status: 'active' });

  const fieldMap = new Map<
    string,
    {
      field: { _id: string; name: string; slug: string };
      subjects: { enrollment: IProfileSubjectEnrollmentDocument; subject: ISubjectDocument }[];
    }
  >();

  for (const enrollment of enrollments) {
    const subject = await Subject.findById(enrollment.subjectId);
    if (!subject) continue;

    const fieldId = subject.fieldId.toString();
    if (!fieldMap.has(fieldId)) {
      const field = await Field.findById(subject.fieldId).select('name slug');
      if (!field) continue;
      fieldMap.set(fieldId, {
        field: { _id: field._id.toString(), name: field.name, slug: field.slug },
        subjects: [],
      });
    }
    fieldMap.get(fieldId)!.subjects.push({ enrollment, subject });
  }

  return { fields: Array.from(fieldMap.values()) };
}

// Returns enrollments filtered to one field (by slug).
export async function getEnrolledSubjectsByField(
  profileId: string,
  fieldSlug: string
): Promise<EnrolledSubjectsByField> {
  const field = await Field.findOne({ slug: fieldSlug, isActive: true });
  if (!field) throw new AppError('Field not found', 404);

  const subjects = await Subject.find({ fieldId: field._id, isActive: true });
  const subjectIds = subjects.map((s) => s._id);

  const enrollments = await ProfileSubjectEnrollment.find({
    profileId,
    subjectId: { $in: subjectIds },
    status: 'active',
  });

  const subjectMap = new Map<string, ISubjectDocument>(subjects.map((s) => [s._id.toString(), s]));

  const subjectEntries = enrollments
    .map((enrollment) => {
      const subject = subjectMap.get(enrollment.subjectId.toString());
      if (!subject) return null;
      return { enrollment, subject } as EnrolledSubjectEntry;
    })
    .filter((e): e is EnrolledSubjectEntry => e !== null);

  return {
    fields: [
      {
        field: { _id: field._id.toString(), name: field.name, slug: field.slug },
        subjects: subjectEntries,
      },
    ],
  };
}

// Returns full progress for one enrolled subject: every Course under it (with its roadmapId)
// plus the subject-level MiniApps (e.g. Dictionary).
export async function getSubjectProgress(
  profileId: string,
  subjectId: string
): Promise<SubjectProgressResult> {
  const enrollment = await ProfileSubjectEnrollment.findOne({ profileId, subjectId });
  if (!enrollment) throw new AppError('Not enrolled in this subject', 404);

  const courseDocs = await Course.find({ subjectId, isActive: true }).sort({ name: 1 });
  const courses = courseDocs.map((course) => ({ course, roadmapId: course.roadmapId.toString() }));

  const miniApps = await MiniApp.find({ subjectId, isActive: true }).sort({ name: 1 });

  return { enrollment, courses, miniApps };
}

// Pauses enrollment — preserves all learning progress.
export async function unenrollFromSubject(
  profileId: string,
  subjectId: string
): Promise<IProfileSubjectEnrollmentDocument> {
  const enrollment = await ProfileSubjectEnrollment.findOne({ profileId, subjectId });
  if (!enrollment) throw new AppError('Not enrolled in this subject', 404);

  enrollment.status = 'paused';
  await enrollment.save();
  return enrollment;
}

// Returns all active subjects with enrollment status for this profile.
export async function getAvailableSubjects(
  profileId: string,
  fieldSlug?: string
): Promise<{ subjects: { subject: ISubjectDocument; field: IFieldDocument; isEnrolled: boolean; enrolledAt?: Date }[] }> {
  const fieldFilter: Record<string, unknown> = { isActive: true };
  if (fieldSlug) {
    const found = await Field.findOne({ slug: fieldSlug, isActive: true });
    if (!found) throw new AppError('Field not found', 404);
    fieldFilter['_id'] = found._id;
  }

  const fields = await Field.find(fieldFilter);
  const fieldIds = fields.map((f) => f._id);
  const subjects = await Subject.find({ fieldId: { $in: fieldIds }, isActive: true });

  const enrollments = await ProfileSubjectEnrollment.find({
    profileId,
    subjectId: { $in: subjects.map((s) => s._id) },
  });

  const enrollmentMap = new Map(enrollments.map((e) => [e.subjectId.toString(), e]));
  const fieldMap = new Map<string, IFieldDocument>(fields.map((f) => [f._id.toString(), f]));

  return {
    subjects: subjects.map((subject) => {
      const enrollment = enrollmentMap.get(subject._id.toString());
      const field = fieldMap.get(subject.fieldId.toString())!;
      return {
        subject,
        field,
        isEnrolled: !!enrollment && enrollment.status === 'active',
        enrolledAt: enrollment?.enrolledAt,
      };
    }),
  };
}

// Updates lastAccessedAt for a subject enrollment.
export async function touchSubjectAccess(profileId: string, subjectId: string): Promise<void> {
  await ProfileSubjectEnrollment.findOneAndUpdate(
    { profileId, subjectId },
    { lastAccessedAt: new Date() }
  );
}

// Recalculates progressSummary from ProfileRoadmapProgress, rolled up across every Course
// under the subject. Called after lesson/node completions.
export async function updateProgressSummary(profileId: string, subjectId: string): Promise<void> {
  const courses = await Course.find({ subjectId, isActive: true });
  if (courses.length === 0) return;

  let totalNodes = 0;
  let completedNodes = 0;
  let totalItems = 0;
  let completedItems = 0;
  let lastActivityAt: Date | undefined;

  for (const course of courses) {
    const roadmap = await Roadmap.findById(course.roadmapId);
    if (!roadmap) continue;

    totalNodes += roadmap.nodes.length;

    const allNodes = await RoadmapNode.find({ roadmapId: roadmap._id, isActive: true });
    totalItems += allNodes.reduce((sum, n) => sum + n.items.length, 0);

    const progress = await ProfileRoadmapProgress.findOne({ profileId, roadmapId: roadmap._id });
    if (!progress) continue;

    progress.nodeProgress.forEach((entry) => {
      if (entry.status === 'completed') completedNodes++;
      entry.itemProgress.forEach((ip) => {
        if (ip.status === 'completed') completedItems++;
      });
    });

    if (progress.lastActivityAt && (!lastActivityAt || progress.lastActivityAt > lastActivityAt)) {
      lastActivityAt = progress.lastActivityAt;
    }
  }

  const overallProgressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  await ProfileSubjectEnrollment.findOneAndUpdate(
    { profileId, subjectId },
    {
      'progressSummary.totalNodes': totalNodes,
      'progressSummary.completedNodes': completedNodes,
      'progressSummary.totalItems': totalItems,
      'progressSummary.completedItems': completedItems,
      'progressSummary.overallProgressPercent': overallProgressPercent,
      'progressSummary.lastActivityAt': lastActivityAt ?? new Date(),
    }
  );
}
