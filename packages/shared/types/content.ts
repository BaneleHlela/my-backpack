// Shared types for the content hierarchy: Field → Subject → Topic → MiniApp.
// Mirrors field.model.ts, subject.model.ts, topic.model.ts, and miniApp.model.ts.

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

export interface ITopic {
  _id: string;
  subjectId: string;
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
  topicId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  type: 'quiz' | 'roadmap' | 'dictionary' | 'flashcards' | 'practice';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MiniAppBreadcrumb {
  miniApp: IMiniApp;
  topic: Pick<ITopic, '_id' | 'name' | 'slug'>;
  subject: Pick<ISubject, '_id' | 'name' | 'slug'>;
  field: Pick<IField, '_id' | 'name' | 'slug'>;
}
