// Raw seed data for subjects. No DB calls — consumed by seeders/content.seed.ts.

export interface SeedSubjectData {
  fieldSlug: string;
  name: string;
  slug: string;
  description: string;
}

export const seedSubjects: SeedSubjectData[] = [
  {
    fieldSlug: 'language',
    name: 'English',
    slug: 'english',
    description: 'English language learning',
  },
  {
    fieldSlug: 'language',
    name: 'IsiZulu Home Language',
    slug: 'isizulu-hl',
    description: 'IsiZulu Home Language',
  },
  {
    fieldSlug: 'mathematics',
    name: 'Foundation Phase Mathematics',
    slug: 'foundation-phase-mathematics',
    description: 'Mathematics for Grade R to Grade 3',
  },
];
