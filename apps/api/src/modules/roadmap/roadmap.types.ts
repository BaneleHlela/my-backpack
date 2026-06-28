// Request/response types for the roadmap module.
import { Types } from 'mongoose';
import { INodeProgressEntry, NodeStatus } from '../../models/learning/profileRoadmapProgress.model';
import { IRoadmapDocument } from '../../models/learning/roadmap.model';
import { IRoadmapNodeDocument } from '../../models/learning/roadmapNode.model';
import { IQuizSessionDocument } from '../../models/learning/quizSession.model';
import { IQuestionDocument } from '../../models/apps/language/vocabulary/question.model';

export interface NodeWithProgress extends IRoadmapNodeDocument {
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
}

export interface NodeDetailResult {
  node: IRoadmapNodeDocument;
  progress: INodeProgressEntry | null;
  questions: IQuestionDocument[];
  isUnlocked: boolean;
}

export interface NodeCompletionResult {
  passed: boolean;
  stars: number;
  score: number;
  rewards: { xp: number; peanuts: number; badge?: string } | null;
  nextNodeId: Types.ObjectId | null;
}

export interface StartAssessmentResult {
  session: IQuizSessionDocument;
  firstQuestion: IQuestionDocument | null;
}
