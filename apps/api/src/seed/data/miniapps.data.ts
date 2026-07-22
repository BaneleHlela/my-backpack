// Raw seed data for subject-level mini-apps. No DB calls — consumed by seeders/content.seed.ts.
// Roadmap-based learning paths are no longer MiniApps — see seeders/roadmaps/ + Course model.
import type { MiniAppType } from '../../models/core/miniApp.model';

export interface SeedMiniAppData {
  subjectSlug: string;
  name: string;
  slug: string;
  type: MiniAppType;
  description: string;
}

export const seedMiniApps: SeedMiniAppData[] = [
  {
    subjectSlug: 'english',
    name: 'Dictionary',
    slug: 'dictionary',
    type: 'dictionary',
    description: 'Search and study English vocabulary terms',
  },
];
