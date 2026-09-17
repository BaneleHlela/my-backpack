export interface XpContext {
  contextId: string;
  contextType: 'course' | 'miniApp';
  contextName: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  courseSlug?: string;
}

export interface XpAward {
  base: number;
  bonus: number;
  total: number;
  bonusRate: number;
  bonusReason: 'performance' | 'already-earned-today' | 'below-threshold' | 'incomplete' | 'mode-ineligible' | 'too-few-questions';
}

export interface XpScopeTotal {
  id: string;
  name: string;
  total: number;
}

export interface XpSummary {
  profileId: string;
  total: number;
  subjects: XpScopeTotal[];
  courses: XpScopeTotal[];
  miniApps: XpScopeTotal[];
  recent: (XpAward & { sessionId: string; title: string; contextName: string; earnedAt: string })[];
}
