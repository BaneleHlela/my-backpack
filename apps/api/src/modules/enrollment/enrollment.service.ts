// Business logic for subject enrollment: enroll, unenroll, progress queries.
import { Types } from 'mongoose';
import ProfileSubjectEnrollment, {
  IProfileSubjectEnrollmentDocument,
} from '../../models/learning/profileSubjectEnrollment.model';
import ProfileRoadmapProgress, {
  INodeProgressEntry,
  ILessonProgressEntry,
} from '../../models/learning/profileRoadmapProgress.model';
import Roadmap from '../../models/learning/roadmap.model';
import RoadmapNode from '../../models/learning/roadmapNode.model';
import Lesson from '../../models/learning/lesson.model';
import Subject, { ISubjectDocument } from '../../models/core/subject.model';
import Field, { IFieldDocument } from '../../models/core/field.model';
import Topic from '../../models/core/topic.model';
import MiniApp from '../../models/core/miniApp.model';
import { AppError } from '../../utils/AppError';
import {
  EnrolledSubjectsByField,
  SubjectProgressResult,
  EnrolledSubjectEntry,
} from './enrollment.types';

// Enroll a profile in a subject. Creates roadmap progress if a subject roadmap exists.
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

  // Find the subject-level roadmap and bootstrap progress.
  const roadmap = await Roadmap.findOne({ subjectId, isActive: true });
  if (roadmap) {
    let totalNodes = 0;
    let totalLessons = 0;

    const sortedNodeRefs = roadmap.nodes.slice().sort((a, b) => a.position - b.position);
    const firstNodeRef = sortedNodeRefs[0];
    const nodeProgress = new Map<string, INodeProgressEntry>();

    if (firstNodeRef) {
      const firstNode = await RoadmapNode.findById(firstNodeRef.nodeId);
      if (firstNode) {
        totalNodes = roadmap.nodes.length;
        const lessonCount = await Lesson.countDocuments({ roadmapId: roadmap._id, isActive: true });
        totalLessons = lessonCount;

        const sortedLessons = firstNode.lessons.slice().sort((a, b) => a.position - b.position);
        const lessonProgress = new Map<string, ILessonProgressEntry>();
        sortedLessons.forEach((lr, idx) => {
          lessonProgress.set(lr.lessonId.toString(), {
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
          lessonProgress,
        });
      }
    }

    await ProfileRoadmapProgress.create({
      profileId: new Types.ObjectId(profileId),
      roadmapId: roadmap._id,
      miniAppId: roadmap.miniAppId,
      nodeProgress,
    });

    enrollment.progressSummary.totalNodes = totalNodes;
    enrollment.progressSummary.totalLessons = totalLessons;
    enrollment.markModified('progressSummary');
    await enrollment.save();
  }

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

// Returns full progress for one enrolled subject, including roadmap id and standalone topics.
export async function getSubjectProgress(
  profileId: string,
  subjectId: string
): Promise<SubjectProgressResult> {
  const enrollment = await ProfileSubjectEnrollment.findOne({ profileId, subjectId });
  if (!enrollment) throw new AppError('Not enrolled in this subject', 404);

  const roadmap = await Roadmap.findOne({ subjectId, isActive: true });
  const roadmapId = roadmap ? roadmap._id.toString() : null;

  const topics = await Topic.find({ subjectId, isActive: true });
  const standaloneTopics = [];
  for (const topic of topics) {
    const miniApps = await MiniApp.find({
      topicId: topic._id,
      type: { $in: ['dictionary', 'quiz', 'flashcards', 'practice'] },
      isActive: true,
    });
    if (miniApps.length > 0) standaloneTopics.push({ topic, miniApps });
  }

  return { enrollment, roadmapId, standaloneTopics };
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

// Recalculates progressSummary from ProfileRoadmapProgress. Called after lesson/node completions.
export async function updateProgressSummary(profileId: string, subjectId: string): Promise<void> {
  const roadmap = await Roadmap.findOne({ subjectId, isActive: true });
  if (!roadmap) return;

  const progress = await ProfileRoadmapProgress.findOne({ profileId, roadmapId: roadmap._id });
  if (!progress) return;

  const totalNodes = roadmap.nodes.length;
  let completedNodes = 0;
  let completedLessons = 0;

  progress.nodeProgress.forEach((entry) => {
    if (entry.status === 'completed') completedNodes++;
    entry.lessonProgress.forEach((lp) => {
      if (lp.status === 'completed') completedLessons++;
    });
  });

  const totalLessons = await Lesson.countDocuments({ roadmapId: roadmap._id, isActive: true });
  const overallProgressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  await ProfileSubjectEnrollment.findOneAndUpdate(
    { profileId, subjectId },
    {
      'progressSummary.totalNodes': totalNodes,
      'progressSummary.completedNodes': completedNodes,
      'progressSummary.totalLessons': totalLessons,
      'progressSummary.completedLessons': completedLessons,
      'progressSummary.overallProgressPercent': overallProgressPercent,
      'progressSummary.lastActivityAt': new Date(),
    }
  );
}
