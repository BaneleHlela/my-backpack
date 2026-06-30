// Raw seed data for topics and their mini-apps. No DB calls — consumed by seeders/content.seed.ts.
import type { MiniAppType } from '../../models/core/miniApp.model';

export interface SeedMiniAppData {
  name: string;
  slug: string;
  type: MiniAppType;
  description: string;
}

export interface SeedTopicData {
  subjectSlug: string;
  name: string;
  slug: string;
  description: string;
  miniApps: SeedMiniAppData[];
}

export const seedTopics: SeedTopicData[] = [
  {
    subjectSlug: 'english',
    name: 'Vocabulary',
    slug: 'vocabulary',
    description: 'English vocabulary building',
    miniApps: [
      {
        name: 'Dictionary',
        slug: 'dictionary',
        type: 'dictionary',
        description: 'Search and study English vocabulary terms',
      },
      {
        name: 'Quiz',
        slug: 'quiz',
        type: 'quiz',
        description: 'Test your English vocabulary knowledge',
      },
    ],
  },
  {
    subjectSlug: 'english',
    name: 'Phonics',
    slug: 'phonics',
    description: 'Letter sounds, vowels, and early reading',
    miniApps: [
      {
        name: 'Phonics Roadmap',
        slug: 'roadmap',
        type: 'roadmap',
        description: 'Learn English phonics step by step',
      },
    ],
  },
  {
    subjectSlug: 'isizulu-hl',
    name: 'Sounds',
    slug: 'sounds',
    description: 'IsiZulu sounds and pronunciation',
    miniApps: [
      {
        name: 'Sounds Roadmap',
        slug: 'roadmap',
        type: 'roadmap',
        description: 'Learn IsiZulu sounds step by step',
      },
    ],
  },
  {
    subjectSlug: 'foundation-phase-mathematics',
    name: 'Number Sense',
    slug: 'number-sense',
    description: 'Counting, number recognition, and basic operations',
    miniApps: [
      {
        name: 'Number Sense Roadmap',
        slug: 'roadmap',
        type: 'roadmap',
        description: 'Learn to count step by step',
      },
    ],
  },
];
