// Quiz Modes catalog — the player-facing "which game do I want to play" concept, deliberately
// named `QuizPlayMode` to avoid colliding with the existing `QuizMode` ('dynamic' | 'fixed') in
// packages/shared/types/quiz.ts, which describes how a Quiz's *content* is sourced (live from
// the bucket vs. a pinned question list) — a completely different axis. See CLAUDE.md's
// "Quiz Modes (mobile)" section and docs/technical/mobile-architecture.md for the full writeup.
//
// Mobile-local (not packages/shared): the catalog carries lucide-react-native icon components,
// which packages/shared (plain TS, no JSX/RN deps) can't hold. Icon names verified against the
// installed lucide-react-native@1.25.0 exports rather than guessed.
//
// toSessionSettingsOverride (below) maps the subset of QuizPlayModeSettings the backend
// actually understands (questionCount/timeLimit/feedbackMode/shuffleQuestions — all real
// QuizSettings fields) into a session-create override; hearts/mistakeLimit have no backend
// counterpart and never leave the client — see QuizSessionScreen's gameplay-mechanics effect.
// Nothing here touches IQuiz/QuizSettings/IQuizSession's own shape.
import type { ComponentType } from 'react';
import { Flame, Heart, Infinity as InfinityIcon, ListChecks, Shield, Sparkles, Timer } from 'lucide-react-native';
import type { FeedbackMode } from '@my-backpack/shared';

export type QuizPlayModeId = 'classic' | 'hearts' | 'time_run' | 'streak' | 'perfect' | 'endless' | 'survival';

// Which single mode-specific control (if any) a mode exposes in the settings modal.
export type QuizPlayModeSettingKey = 'questionCount' | 'duration' | 'hearts' | 'mistakeLimit' | 'none';

// Local-state-only shape for now — nothing here is sent to the API. feedbackMode/shuffleQuestions
// reuse QuizSettings' existing field names/types (packages/shared/types/quiz.ts) rather than
// inventing new ones for the same concepts.
export interface QuizPlayModeSettings {
  questionCount?: number;
  duration?: number; // seconds
  hearts?: number;
  mistakeLimit?: number;
  feedbackMode?: FeedbackMode;
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
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  settingKey: QuizPlayModeSettingKey;
  settingLabel?: string;
  settingOptions?: QuizPlayModeSettingOption[];
  defaultSettings: QuizPlayModeSettings;
}

export const QUIZ_PLAY_MODES: QuizPlayModeDef[] = [
  {
    id: 'classic',
    label: 'Classic',
    blurb: 'Answer a fixed number of questions. Your score is correct out of total.',
    icon: ListChecks,
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
    icon: Heart,
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
    icon: Timer,
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
    icon: Flame,
    settingKey: 'none',
    defaultSettings: {},
  },
  {
    id: 'perfect',
    label: 'Perfect',
    blurb: 'One mistake ends the run. Get through every question with a perfect score.',
    icon: Sparkles,
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
    icon: InfinityIcon,
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
    icon: Shield,
    settingKey: 'none',
    defaultSettings: {},
  },
];

// Sessions started with an open-ended mode (Hearts/Streak/Endless/Survival/Time Run — anything
// without a chosen questionCount) request this many pool questions instead of a real count, so
// the session naturally caps at however many active questions the course actually has rather
// than serving just one. Deliberate v1 simplification — see quiz.model.ts's mode:'pool' comment
// (backend) for the matching note; a small course pool just means the run ends early via the
// server's ordinary "ran out of questions" completion, not a real "give me everything" query.
const OPEN_ENDED_QUESTION_COUNT = 200;

// Maps a chosen mode + its local settings onto the shape createSessionHandler/createQuizSession
// actually accept (packages/shared/types/quiz.ts's QuizSettings, minus questionTypes/
// bucketFilter which nothing here needs to override). hearts/mistakeLimit are deliberately never
// included — they have no backend counterpart and stay purely client-side state in
// QuizSessionScreen (see its "real gameplay mechanics" section in
// docs/technical/mobile-architecture.md).
export function toSessionSettingsOverride(
  settings: QuizPlayModeSettings
): { questionCount: number; timeLimit?: number; feedbackMode?: FeedbackMode; shuffleQuestions?: boolean } {
  return {
    questionCount: settings.questionCount ?? OPEN_ENDED_QUESTION_COUNT,
    timeLimit: settings.duration,
    feedbackMode: settings.feedbackMode,
    shuffleQuestions: settings.shuffleQuestions,
  };
}

// Expo Router params are strings only — a chosen mode + its settings crosses the navigation
// boundary (QuizModeSelectScreen/QuizPickerModal -> the route wrapper files -> QuizSessionScreen)
// as one JSON-encoded `play` param. encode/parse are the single source of truth for that shape
// so the two sides can't drift.
export function encodePlayModeParam(id: QuizPlayModeId, settings: QuizPlayModeSettings): string {
  return JSON.stringify({ id, settings });
}

// Returns undefined on missing/malformed input rather than throwing — every caller treats "no
// chosen mode" as a valid, ordinary state (QuizSessionScreen just skips all Quiz Modes gameplay
// mechanics when playMode is undefined).
export function parsePlayModeParam(
  raw: string | undefined
): { id: QuizPlayModeId; settings: QuizPlayModeSettings } | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; settings?: unknown };
    if (typeof parsed.id === 'string' && parsed.settings && typeof parsed.settings === 'object') {
      return { id: parsed.id as QuizPlayModeId, settings: parsed.settings as QuizPlayModeSettings };
    }
  } catch {
    // malformed — fall through to undefined
  }
  return undefined;
}

export function getQuizPlayMode(id: QuizPlayModeId): QuizPlayModeDef {
  const mode = QUIZ_PLAY_MODES.find((m) => m.id === id);
  if (!mode) {
    throw new Error(`Unknown quiz play mode: ${id}`);
  }
  return mode;
}

// Renders a mode's current mode-specific setting as pill copy (e.g. "10 Questions",
// "3 Min", "5 Hearts") for QuizModeCard's settings pill. Falls back to the mode's own
// label for modes with no adjustable setting (Streak, Survival).
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
    case 'none':
    default:
      return mode.label;
  }
}
