// Quiz Modes catalog — shared, icon-free metadata for the "which game do I want to play"
// concept (deliberately named QuizPlayMode to avoid colliding with QuizMode ('dynamic' |
// 'fixed' | 'pool') in ../types/quiz.ts, which describes how a Quiz's *content* is sourced —
// a completely different axis). See CLAUDE.md's "Quiz Modes" entry and
// docs/technical/mobile-architecture.md for the full writeup.
//
// Split across two layers: this file holds the plain data both apps/mobile (Quiz Mode Select
// grid + gameplay mechanics) and apps/web's Content Studio (a teacher assigning one specific
// mode + its settings to a Topic quiz, via Quiz.assignedPlayMode) need identically — a single
// source of truth so the two surfaces can't drift on labels/options/defaults.
// apps/mobile/src/components/quiz/quizPlayModes.ts re-exports this catalog and layers
// lucide-react-native icons + navigation-only helpers (encode/parsePlayModeParam,
// toSessionSettingsOverride) on top locally — icons and Expo Router params have no place in a
// plain-TS shared package.
export type QuizPlayModeId =
  | 'classic'
  | 'hearts'
  | 'time_run'
  | 'streak'
  | 'perfect'
  | 'endless'
  | 'survival'
  | 'mastery';

// Which single mode-specific control (if any) a mode exposes.
export type QuizPlayModeSettingKey =
  | 'questionCount'
  | 'duration'
  | 'hearts'
  | 'mistakeLimit'
  | 'streakTarget'
  | 'none';

export interface QuizPlayModeSettings {
  questionCount?: number;
  duration?: number; // seconds
  hearts?: number;
  mistakeLimit?: number;
  streakTarget?: number; // Mastery — consecutive correct answers required to pass
  feedbackMode?: 'immediate' | 'end';
  shuffleQuestions?: boolean;
}

export interface QuizPlayModeSettingOption {
  label: string;
  value: number;
}

export interface QuizPlayModeDef {
  id: QuizPlayModeId;
  label: string;
  blurb: string;
  settingKey: QuizPlayModeSettingKey;
  settingLabel?: string;
  settingOptions?: QuizPlayModeSettingOption[];
  defaultSettings: QuizPlayModeSettings;
}

// A teacher's fixed assignment of exactly one mode + its settings to a mode:'fixed' Topic quiz
// (Quiz.assignedPlayMode — see quiz.model.ts). When set, mobile skips Quiz Mode Select entirely
// and starts the learner straight into gameplay under this exact configuration — no choice, no
// settings to touch. When null (default), the quiz plays as an ordinary session, exactly as
// before Quiz Modes existed. Not read for mode:'dynamic'/'pool' quizzes (Dictionary's quiz, a
// course's auto-created practice pool) — those stay learner-chosen via the Quiz Mode Select grid
// regardless, since they're inherently "game" surfaces, not curated lesson content.
export interface IAssignedPlayMode {
  id: QuizPlayModeId;
  settings: QuizPlayModeSettings;
}

export const QUIZ_PLAY_MODES: QuizPlayModeDef[] = [
  {
    id: 'classic',
    label: 'Classic',
    blurb: 'Answer a fixed number of questions. Your score is correct out of total.',
    settingKey: 'questionCount',
    settingLabel: 'Question count',
    settingOptions: [
      { label: '5', value: 5 },
      { label: '10', value: 10 },
      { label: '15', value: 15 },
      { label: '20', value: 20 },
    ],
    defaultSettings: { questionCount: 10 },
  },
  {
    id: 'hearts',
    label: 'Hearts',
    blurb: 'Start with a few lives. Lose one on every wrong answer — game over at zero.',
    settingKey: 'hearts',
    settingLabel: 'Number of hearts',
    settingOptions: [
      { label: '3', value: 3 },
      { label: '5', value: 5 },
    ],
    defaultSettings: { hearts: 3 },
  },
  {
    id: 'time_run',
    label: 'Time Run',
    blurb: 'Answer as many questions as you can before the clock runs out.',
    settingKey: 'duration',
    settingLabel: 'Duration',
    settingOptions: [
      { label: '30s', value: 30 },
      { label: '60s', value: 60 },
      { label: '2 Min', value: 120 },
      { label: '3 Min', value: 180 },
    ],
    defaultSettings: { duration: 60 },
  },
  {
    id: 'streak',
    label: 'Streak',
    blurb: 'Keep answering correctly to build your streak. One wrong answer resets it to zero.',
    settingKey: 'none',
    defaultSettings: {},
  },
  {
    id: 'perfect',
    label: 'Perfect',
    blurb: 'One mistake ends the run. Get through every question with a perfect score.',
    settingKey: 'questionCount',
    settingLabel: 'Question count',
    settingOptions: [
      { label: '5', value: 5 },
      { label: '10', value: 10 },
      { label: '15', value: 15 },
    ],
    defaultSettings: { questionCount: 10 },
  },
  {
    id: 'endless',
    label: 'Endless',
    blurb: 'Keep going until your mistakes add up. See how many questions you can rack up.',
    settingKey: 'mistakeLimit',
    settingLabel: 'Mistake limit',
    settingOptions: [
      { label: '3', value: 3 },
      { label: '5', value: 5 },
      { label: '10', value: 10 },
    ],
    defaultSettings: { mistakeLimit: 5 },
  },
  {
    id: 'survival',
    label: 'Survival',
    blurb: 'Like Hearts, but it gets harder the further you go. How far can you get?',
    settingKey: 'none',
    defaultSettings: {},
  },
  {
    id: 'mastery',
    label: 'Mastery',
    blurb:
      'Answer correctly a set number of times in a row to pass. A mistake resets your streak — questions repeat and reshuffle until you get there.',
    settingKey: 'streakTarget',
    settingLabel: 'Correct in a row to pass',
    settingOptions: [
      { label: '3', value: 3 },
      { label: '5', value: 5 },
      { label: '7', value: 7 },
      { label: '10', value: 10 },
    ],
    defaultSettings: { streakTarget: 5 },
  },
];

export function getQuizPlayMode(id: QuizPlayModeId): QuizPlayModeDef {
  const mode = QUIZ_PLAY_MODES.find((m) => m.id === id);
  if (!mode) {
    throw new Error(`Unknown quiz play mode: ${id}`);
  }
  return mode;
}

// Renders a mode's current mode-specific setting as pill/label copy (e.g. "10 Questions",
// "3 Min", "5 Hearts", "5 In A Row"). Falls back to the mode's own label for modes with no
// adjustable setting (Streak, Survival).
export function formatModeSettingPill(mode: QuizPlayModeDef, settings: QuizPlayModeSettings): string {
  switch (mode.settingKey) {
    case 'questionCount':
      return `${settings.questionCount ?? mode.defaultSettings.questionCount} Questions`;
    case 'duration': {
      const seconds = settings.duration ?? mode.defaultSettings.duration ?? 0;
      return seconds % 60 === 0 ? `${seconds / 60} Min` : `${seconds}s`;
    }
    case 'hearts':
      return `${settings.hearts ?? mode.defaultSettings.hearts} Hearts`;
    case 'mistakeLimit':
      return `${settings.mistakeLimit ?? mode.defaultSettings.mistakeLimit} Mistakes`;
    case 'streakTarget':
      return `${settings.streakTarget ?? mode.defaultSettings.streakTarget} In A Row`;
    case 'none':
    default:
      return mode.label;
  }
}
