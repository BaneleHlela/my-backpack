// Shared types for the content hierarchy: Field → Subject → Course[] / MiniApp[].
// Mirrors field.model.ts, subject.model.ts, course.model.ts, and miniApp.model.ts.
// `Topic` was removed entirely (July 2026) — grouping MiniApps under a Subject is now just
// MiniApp.subjectId, and the "individual roadmap step" meaning belongs to RoadmapNode.
import type { ICurriculumTag } from './roadmap';

export interface IField {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISubject {
  _id: string;
  fieldId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IMiniApp {
  _id: string;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  type: 'quiz' | 'dictionary' | 'flashcards' | 'practice';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Minimal roadmap info embedded in a course summary — not the full IRoadmap.
export interface ICourseRoadmapSummary {
  _id: string;
  title: string;
  description?: string;
  nodeCount: number;
}

// Shape returned by both GET .../courses (list) and .../courses/:courseSlug (detail).
// miniAppIds is populated (partial IMiniApp objects) on the detail fetch only — on the list
// fetch it's plain id strings. Callers that need populated mini-app info should use the
// detail endpoint.
export interface ICourseSummary {
  _id: string;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  miniAppIds: string[] | Pick<IMiniApp, '_id' | 'name' | 'slug' | 'type' | 'description'>[];
  curriculumTags: ICurriculumTag[];
  isActive: boolean;
  roadmap: ICourseRoadmapSummary;
}

export interface MiniAppBreadcrumb {
  miniApp: IMiniApp;
  subject: Pick<ISubject, '_id' | 'name' | 'slug'>;
  field: Pick<IField, '_id' | 'name' | 'slug'>;
}
