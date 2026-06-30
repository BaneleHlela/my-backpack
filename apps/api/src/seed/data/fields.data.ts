// Raw seed data for top-level content fields. No DB calls — consumed by seeders/content.seed.ts.

export interface SeedFieldData {
  name: string;
  slug: string;
  description: string;
}

export const seedFields: SeedFieldData[] = [
  { name: 'Language', slug: 'language', description: 'Languages and linguistic skills' },
  { name: 'Mathematics', slug: 'mathematics', description: 'Numbers, logic, and problem solving' },
];
