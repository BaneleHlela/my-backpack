// Shared types for the roadmap system.
// Mirrors roadmap.model.ts, roadmapNode.model.ts, lesson.model.ts,
// and profileRoadmapProgress.model.ts.
//
// A RoadmapNode contains an ordered list of heterogeneous `items` — currently 'lesson'
// (pure study material) or 'quiz' (references a Quiz document directly, no wrapper Lesson).
// Extensible later to 'resource' | 'notes' | 'chatbot' etc — not built yet.

export type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type ItemStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type CurriculumType = 'CAPS' | 'IEB' | 'Cambridge' | 'University' | 'Other';
export type NodeType = 'lesson' | 'checkpoint' | 'practice';
export type NodeItemType = 'lesson' | 'quiz'; // extensible later: 'resource' | 'notes' | 'chatbot'
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

export interface INodeItemRef {
  itemType: NodeItemType;
  itemId: string;        // Lesson._id when itemType==='lesson', Quiz._id when itemType==='quiz'
  position: number;
  passingScore?: number; // only meaningful when itemType==='quiz'
}

export interface IRoadmapNode {
  _id: string;
  roadmapId: string;
  title: string;
  description?: string;
  position: number;
  type: NodeType;
  curriculumTags: ICurriculumTag[];
  items: INodeItemRef[];
  unlockRequires: string[];
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
