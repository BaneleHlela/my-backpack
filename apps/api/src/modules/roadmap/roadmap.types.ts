// Request/response types for the roadmap module.
import { Types } from 'mongoose';
import {
  INodeProgressEntry,
  IItemProgressEntry,
  NodeStatus,
  ItemStatus,
} from '../../models/learning/profileRoadmapProgress.model';
import { IRoadmapDocument } from '../../models/learning/roadmap.model';
import { IRoadmapNodeDocument, NodeItemType } from '../../models/learning/roadmapNode.model';
import { ILessonDocument } from '../../models/learning/lesson.model';
import { IQuizSessionDocument } from '../../models/learning/quizSession.model';
import { IQuestionDocument } from '../../models/apps/language/vocabulary/question.model';

export interface QuizItemSummary {
  _id: Types.ObjectId;
  title: string;
  questionCount: number;
}

export interface ResolvedLessonItem {
  itemType: 'lesson';
  itemId: Types.ObjectId;
  position: number;
  progressStatus: ItemStatus;
  isUnlocked: boolean;
  lesson: ILessonDocument;
}

export interface ResolvedQuizItem {
  itemType: 'quiz';
  itemId: Types.ObjectId;
  position: number;
  passingScore: number;
  progressStatus: ItemStatus;
  isUnlocked: boolean;
  quiz: QuizItemSummary;
}

export type ResolvedNodeItem = ResolvedLessonItem | ResolvedQuizItem;

// Omit the typed items[] from the parent so we can replace it with ResolvedNodeItem[].
export interface NodeWithProgress extends Omit<IRoadmapNodeDocument, 'items'> {
  items: ResolvedNodeItem[];
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
  completedItems: number;
  totalItems: number;
}

export interface LessonDetailResult {
  lesson: ILessonDocument;
  progress: IItemProgressEntry | null;
  isUnlocked: boolean;
}

export interface NodeDetailResult {
  node: IRoadmapNodeDocument;
  progress: INodeProgressEntry | null;
  items: ResolvedNodeItem[];
  isUnlocked: boolean;
}

export interface ItemCompletionResult {
  itemCompleted: boolean;
  nodeCompleted: boolean;
  nextItemId: Types.ObjectId | null;
  nextItemType: NodeItemType | null;
  rewards: { xp: number; peanuts: number; badge?: string } | null;
}

export interface NodeCompletionResult {
  passed: boolean;
  stars: number;
  score: number;
  rewards: { xp: number; peanuts: number; badge?: string } | null;
  nextNodeId: Types.ObjectId | null;
}

export interface StartQuizItemResult {
  session: IQuizSessionDocument;
  firstQuestion: IQuestionDocument | null;
}
