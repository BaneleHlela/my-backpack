// Shared types for the roadmap system.
// Mirrors roadmap.model.ts, roadmapNode.model.ts, and profileRoadmapProgress.model.ts.
import { INodeQuestionAssignment } from './question';

export type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';
export type NodeType = 'lesson' | 'checkpoint' | 'practice';

export interface ICurriculumTag {
  curriculum: CurriculumType;
  gradeLevel: string;
}

export interface IStudyMaterial {
  notes?: string;
  audioUrl?: string;
  videoUrl?: string;
  bookReference?: {
    bookId?: string;
    chapterNumber?: number;
    pageStart?: number;
    pageEnd?: number;
  };
}

export interface IAssessmentSettings {
  passingScore: number;
  attemptsAllowed: number;
  timeLimitSeconds?: number;
  questionAssignments: INodeQuestionAssignment[];
}

export interface INodeRewards {
  xp: number;
  peanuts: number;
  badge?: string;
}

export interface IRoadmap {
  _id: string;
  miniAppId: string;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IRoadmapNode {
  _id: string;
  roadmapId: string;
  title: string;
  description?: string;
  position: number;
  type: NodeType;
  curriculumTags: ICurriculumTag[];
  studyMaterial: IStudyMaterial;
  assessment: IAssessmentSettings;
  unlockRequires: string[];
  rewards: INodeRewards;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface INodeProgressEntry {
  status: NodeStatus;
  stars: number;
  attempts: number;
  bestScore: number;
  lastAttemptAt?: string;
  completedAt?: string;
  studyMaterialViewedAt?: string;
}

export interface IProfileRoadmapProgress {
  _id: string;
  profileId: string;
  roadmapId: string;
  miniAppId: string;
  nodeProgress: Record<string, INodeProgressEntry>;
  currentNodeId?: string;
  totalStars: number;
  startedAt: string;
  lastActivityAt?: string;
}

export interface RoadmapWithProgress {
  roadmap: IRoadmap;
  nodes: (IRoadmapNode & {
    progressStatus: NodeStatus;
    stars: number;
    isUnlocked: boolean;
  })[];
  totalStars: number;
  completedNodes: number;
  totalNodes: number;
}

export interface NodeCompletionResult {
  passed: boolean;
  stars: number;
  score: number;
  rewards: INodeRewards | null;
  nextNodeId: string | null;
}
