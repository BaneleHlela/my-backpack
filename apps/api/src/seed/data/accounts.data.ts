// Raw seed data for accounts and their profiles. No DB calls — consumed by seeders/accounts.seed.ts.
import type { AgeGroup, EducationLevel } from '../../models/core/profile.model';

export interface SeedProfileData {
  displayName: string;
  ageGroup: AgeGroup;
  isOwner: boolean;
  dateOfBirth: string;
  education: {
    currentLevel: EducationLevel;
    institution?: string;
  };
  pin?: string;
}

export interface SeedAccountData {
  email: string;
  password: string;
  profiles: SeedProfileData[];
}

export const seedAccounts: SeedAccountData[] = [
  {
    email: 'banele@test.com',
    password: 'Test1234!',
    profiles: [
      {
        displayName: 'Banele',
        ageGroup: 'adult',
        isOwner: true,
        dateOfBirth: '1997-06-15',
        education: {
          currentLevel: 'bachelors',
          institution: 'UKZN',
        },
      },
      {
        displayName: 'Zano',
        ageGroup: 'child',
        isOwner: false,
        dateOfBirth: '2021-03-10',
        education: {
          currentLevel: 'grade-r',
        },
        pin: '1234',
      },
      {
        displayName: 'Lubanzi',
        ageGroup: 'child',
        isOwner: false,
        dateOfBirth: '2020-08-22',
        education: {
          currentLevel: 'grade-1',
        },
        pin: '5678',
      },
    ],
  },
];
