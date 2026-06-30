// Request/response types for the roadmap module.
import { Types } from 'mongoose';
import {
  INodeProgressEntry,
  ILessonProgressEntry,
  NodeStatus,
  LessonStatus,
} from '../../models/learning/profileRoadmapProgress.model';
import { IRoadmapDocument } from '../../models/learning/roadmap.model';
import { IRoadmapNodeDocument } from '../../models/learning/roadmapNode.model';
import { ILessonDocument, LessonType, ILessonStudyMaterial } from '../../models/learning/lesson.model';
import { IQuizSessionDocument } from '../../models/learning/quizSession.model';
import { IQuestionDocument } from '../../models/apps/language/vocabulary/question.model';

// Plain shape of a lesson document (without Mongoose Document methods).
export interface LessonPlain {
  _id: Types.ObjectId;
  nodeId: Types.ObjectId;
  roadmapId: Types.ObjectId;
  position: number;
  title: string;
  lessonType: LessonType;
  studyMaterial?: ILessonStudyMaterial;
  quizId?: Types.ObjectId;
  passingScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonWithProgress extends LessonPlain {
  progressStatus: LessonStatus;
  isUnlocked: boolean;
}

// Omit the typed lessons[] from the parent so we can replace it with LessonWithProgress[].
export interface NodeWithProgress extends Omit<IRoadmapNodeDocument, 'lessons'> {
  lessons: LessonWithProgress[];
  progressStatus: NodeStatus;
  stars: number;
  isUnlocked: boolean;
}

export interface RoadmapWithProgressResult {
  roadmap: IRoadmapDocument;
  nodes: NodeWithProgress[];
  totalStars: number;
  completedNodes: number;
  totalNodes: number;
  completedLessons: number;
  totalLessons: number;
}

export interface LessonDetailResult {
  lesson: ILessonDocument;
  progress: ILessonProgressEntry | null;
  questions: IQuestionDocument[];
  isUnlocked: boolean;
}

export interface NodeDetailResult {
  node: IRoadmapNodeDocument;
  progress: INodeProgressEntry | null;
  lessons: LessonWithProgress[];
  isUnlocked: boolean;
}

export interface LessonCompletionResult {
  lessonCompleted: boolean;
  nodeCompleted: boolean;
  nextLessonId: Types.ObjectId | null;
  rewards: { xp: number; peanuts: number; badge?: string } | null;
}

export interface NodeCompletionResult {
  passed: boolean;
  stars: number;
  score: number;
  rewards: { xp: number; peanuts: number; badge?: string } | null;
  nextNodeId: Types.ObjectId | null;
}

export interface StartLessonResult {
  session: IQuizSessionDocument;
  firstQuestion: IQuestionDocument | null;
}
