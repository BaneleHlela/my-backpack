// Shared types for the content hierarchy: Subject → Topic → MiniApp.
// Mirrors subject.model.ts, topic.model.ts, and miniApp.model.ts.

export interface ISubject {
  _id: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
