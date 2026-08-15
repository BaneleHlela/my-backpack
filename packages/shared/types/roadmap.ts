// Shared types for the roadmap system.
// Mirrors roadmap.model.ts, roadmapNode.model.ts, lesson.model.ts,
// and profileRoadmapProgress.model.ts.
//
// A RoadmapNode contains an ordered list of heterogeneous `items` — currently 'lesson'
// (pure study material) or 'quiz' (references a Quiz document directly, no wrapper Lesson).
// Extensible later to 'resource' | 'notes' | 'chatbot' etc — not built yet.
import type { IAssignedPlayMode } from '../constants/quizPlayModes';

export type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type ItemStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';
export type NodeType = 'lesson' | 'checkpoint' | 'practice';
// 'project' is reserved — no Project model, resolution, or progress logic exists yet (no icon
// asset either). Extensible later: 'resource' | 'notes' | 'chatbot'
export type NodeItemType = 'lesson' | 'quiz' | 'project';
export type ResourceType = 'video' | 'pdf' | 'image' | 'notes' | 'audio' | 'steps';

export interface ICurriculumTag {
  curriculum: CurriculumType;
  gradeLevel: string;
}

export interface IResourceStep {
  title?: string;
  content: string; // markdown
}

export interface IResource {
  type: ResourceType;
  position: number;
  url?: string;            // video/pdf/image/audio
  caption?: string;        // video/image/audio
  title?: string;          // pdf
  markdown?: string;       // notes
  steps?: IResourceStep[]; // steps
  thumbnailUrl?: string;   // video
  description?: string;    // video
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
  resources: IResource[];
  // Video-watch completion gating (August 2026) — teacher-configurable per lesson, default
  // true (opt-out). See lesson.model.ts for the full semantics.
  requireVideoWatch: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// A pure ordered container of nodes, referenced from Course.roadmapId — carries no
// subject/miniApp context of its own.
export interface IRoadmap {
  _id: string;
  title: string;
  description?: string;
  nodes: { nodeId: string; position: number }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// One tier of a quiz item's star-grading scale: score at or above minScore (0-1, a ratio not a
// percent) awards `stars` (0-3, matches INodeProgressEntry.stars's cap). Teacher-configured from
// Content Studio's QuizEditorPage — see gradeSettings.ts (api) for the fallback used when a quiz
// item has none set (reproduces the historical hardcoded 100%→3★/85%→2★/passingScore→1★ scale).
export interface IStarThreshold {
  minScore: number;
  stars: number;
}

export interface INodeItemRef {
  itemType: NodeItemType;
  itemId: string;        // Lesson._id when itemType==='lesson', Quiz._id when itemType==='quiz'
  position: number;
  passingScore?: number;          // only meaningful when itemType==='quiz'
  starThresholds?: IStarThreshold[]; // only meaningful when itemType==='quiz'; see IStarThreshold
}

// Resolved (never-undefined) grade settings for one quiz item ref — what Content Studio's
// QuizEditorPage reads/writes. `passingScore`/`starThresholds` are optional on the raw
// INodeItemRef; this is always the fully-defaulted shape (see gradeSettings.ts on the API side).
export interface IQuizGradeSettings {
  passingScore: number;
  starThresholds: IStarThreshold[];
}

export interface IRoadmapNode {
  _id: string;
  roadmapId: string;
  title: string;
  slug: string;
  description?: string;
  position: number;
  type: NodeType;
  curriculumTags: ICurriculumTag[];
  items: INodeItemRef[];
  unlockRequires: string[];
  // Reserved for the deferred multi-provider-course feature — always empty today.
  linkedCourseIds: string[];
  rewards: INodeRewards;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IItemProgressEntry {
  status: ItemStatus;
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
  itemProgress: Record<string, IItemProgressEntry>;
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

export interface ItemCompletionResult {
  itemCompleted: boolean;
  nodeCompleted: boolean;
  nextItemId: string | null;
  nextItemType: NodeItemType | null;
  rewards: INodeRewards | null;
}

// Minimal Quiz metadata needed for display — not the full Quiz document.
export interface IQuizItemSummary {
  _id: string;
  title: string;
  questionCount: number;
  // Mirrors Quiz.assignedPlayMode — carried here so mobile can start this item straight into
  // its teacher-assigned mode (no Quiz Mode Select screen, no learner choice) without a
  // separate API call. null means an ordinary session, exactly as before Quiz Modes existed.
  // See quiz.model.ts / constants/quizPlayModes.ts / mobile-architecture.md's "Quiz Modes"
  // section.
  assignedPlayMode: IAssignedPlayMode | null;
}

export type NodeItemWithProgress =
  | {
      itemType: 'lesson';
      itemId: string;
      position: number;
      progressStatus: ItemStatus;
      isUnlocked: boolean;
      lesson: ILesson;
    }
  | {
      itemType: 'quiz';
      itemId: string;
      position: number;
      passingScore: number;
      progressStatus: ItemStatus;
      isUnlocked: boolean;
      quiz: IQuizItemSummary;
    };

export interface RoadmapWithProgress {
  roadmap: IRoadmap;
  nodes: (IRoadmapNode & {
    progressStatus: NodeStatus;
    stars: number;
    isUnlocked: boolean;
    items: NodeItemWithProgress[];
  })[];
  totalStars: number;
  completedNodes: number;
  totalNodes: number;
  completedItems: number;
  totalItems: number;
}

export interface NodeCompletionResult {
  passed: boolean;
  stars: number;
  score: number;
  rewards: INodeRewards | null;
  nextNodeId: string | null;
}
