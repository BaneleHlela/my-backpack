// Shared types for the roadmap system.
// Mirrors roadmap.model.ts, roadmapNode.model.ts, lesson.model.ts,
// and profileRoadmapProgress.model.ts.

export type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type LessonStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type LessonType = 'introduction' | 'practice' | 'assessment';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';
export type NodeType = 'lesson' | 'checkpoint' | 'practice';

export interface ICurriculumTag {
  curriculum: CurriculumType;
  gradeLevel: string;
}

export interface ILessonStudyMaterial {
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

export interface INodeRewards {
  xp: number;
  peanuts: number;
  badge?: string;
}

export interface ILesson {
  _id: string;
  nodeId: string;
  roadmapId: string;
  position: number;
  title: string;
  lessonType: LessonType;
  studyMaterial?: ILessonStudyMaterial;
  quizId?: string;
  passingScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IRoadmap {
  _id: string;
  subjectId?: string;
  miniAppId?: string;
  title: string;
  description?: string;
  nodes: { nodeId: string; position: number }[];
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
  lessons: { lessonId: string; position: number }[];
  unlockRequires: string[];
  rewards: INodeRewards;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ILessonProgressEntry {
  status: LessonStatus;
  completedAt?: string;
  attempts: number;
  bestScore: number;
  studyMaterialViewedAt?: string;
  lastAttemptAt?: string;
}

export interface INodeProgressEntry {
  status: NodeStatus;
  stars: number;
  attempts: number;
  bestScore: number;
  lastAttemptAt?: string;
  completedAt?: string;
  lessonProgress: Record<string, ILessonProgressEntry>;
}

export interface IProfileRoadmapProgress {
  _id: string;
  profileId: string;
  roadmapId: string;
  miniAppId?: string;
  nodeProgress: Record<string, INodeProgressEntry>;
  currentNodeId?: string;
  totalStars: number;
  startedAt: string;
  lastActivityAt?: string;
}

export interface LessonCompletionResult {
  lessonCompleted: boolean;
  nodeCompleted: boolean;
  nextLessonId: string | null;
  rewards: INodeRewards | null;
}

export interface RoadmapWithProgress {
  roadmap: IRoadmap;
  nodes: (IRoadmapNode & {
    progressStatus: NodeStatus;
    stars: number;
    isUnlocked: boolean;
    lessons: (ILesson & {
      progressStatus: LessonStatus;
      isUnlocked: boolean;
    })[];
  })[];
  totalStars: number;
  completedNodes: number;
  totalNodes: number;
  completedLessons: number;
  totalLessons: number;
}

export interface NodeCompletionResult {
  passed: boolean;
  stars: number;
  score: number;
  rewards: INodeRewards | null;
  nextNodeId: string | null;
}
