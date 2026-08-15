// Quiz Modes catalog — the player-facing "which game do I want to play" concept. The plain data
// (ids, labels, blurbs, setting options/defaults — everything Content Studio's web
// QuizEditorPage also needs to build its mode-assignment form) lives in
// packages/shared/constants/quizPlayModes.ts, the single source of truth for both apps. This
// file layers two mobile-only things on top of that shared catalog:
//   1. lucide-react-native icon components (QUIZ_PLAY_MODE_ICONS) — plain-TS shared can't hold
//      JSX/RN component references.
//   2. Expo Router navigation helpers (encode/parsePlayModeParam, toSessionSettingsOverride,
//      OPEN_ENDED_QUESTION_COUNT) — these only mean something on mobile's own routing.
// See CLAUDE.md's "Quiz Modes" section and docs/technical/mobile-architecture.md for the full
// writeup.
//
// toSessionSettingsOverride (below) maps the subset of QuizPlayModeSettings the backend
// actually understands (questionCount/timeLimit/feedbackMode/shuffleQuestions — all real
// QuizSettings fields) into a session-create override; hearts/mistakeLimit/streakTarget have no
// backend counterpart and never leave the client — see QuizSessionScreen's gameplay-mechanics
// effect. Nothing here touches IQuiz/QuizSettings/IQuizSession's own shape.
import type { ComponentType } from 'react';
import { Flame, Heart, Infinity as InfinityIcon, ListChecks, Shield, Sparkles, Target, Timer } from 'lucide-react-native';
import {
  QUIZ_PLAY_MODES,
  getQuizPlayMode,
  formatModeSettingPill,
  type FeedbackMode,
  type QuizPlayModeId,
  type QuizPlayModeSettings,
  type QuizPlayModeDef,
  type QuizPlayModeSettingKey,
  type QuizPlayModeSettingOption,
  type IAssignedPlayMode,
} from '@my-backpack/shared';

export type {
  QuizPlayModeId,
  QuizPlayModeSettings,
  QuizPlayModeDef,
  QuizPlayModeSettingKey,
  QuizPlayModeSettingOption,
  IAssignedPlayMode,
};
export { QUIZ_PLAY_MODES, getQuizPlayMode, formatModeSettingPill };

// Icons verified against the installed lucide-react-native@1.25.0 exports rather than guessed.
export const QUIZ_PLAY_MODE_ICONS: Record<QuizPlayModeId, ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  classic: ListChecks,
  hearts: Heart,
  time_run: Timer,
  streak: Flame,
  perfect: Sparkles,
  endless: InfinityIcon,
  survival: Shield,
  mastery: Target,
};

// Sessions started with an open-ended mode (Hearts/Streak/Perfect/Endless/Survival/Mastery/
// Time Run — anything without a chosen questionCount) request this many pool questions instead
// of a real count, so the session naturally caps at however many active questions the course
// actually has rather than serving just one. Deliberate v1 simplification — see quiz.model.ts's
// mode:'pool' comment (backend) for the matching note; a small course pool just means the run
// ends early via the server's ordinary "ran out of questions" completion, not a real "give me
// everything" query. For a roadmapItem (Topic) session this constant is never actually sent —
// startQuizItemSession has no settings-override param, so a Topic quiz's own fixed questionIds
// list is always what's served, repeating/reshuffling leg-by-leg for Mastery (see
// QuizSessionScreen's "Mastery" gameplay section).
const OPEN_ENDED_QUESTION_COUNT = 200;

// Maps a chosen mode + its local settings onto the shape createSessionHandler/createQuizSession
// actually accept (packages/shared/types/quiz.ts's QuizSettings, minus questionTypes/
// bucketFilter which nothing here needs to override). hearts/mistakeLimit/streakTarget are
// deliberately never included — they have no backend counterpart and stay purely client-side
// state in QuizSessionScreen (see its "real gameplay mechanics" section in
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
// boundary (QuizModeSelectScreen/QuizPickerModal/RoadmapPath/course index -> the route wrapper
// files -> QuizSessionScreen) as one JSON-encoded `play` param. encode/parse are the single
// source of truth for that shape so the two sides can't drift. Also used directly to carry a
// teacher's Quiz.assignedPlayMode (IAssignedPlayMode) straight into a Topic quiz's session
// route — same shape, same encoding, no separate mode-select screen involved.
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

// Encodes a teacher's Quiz.assignedPlayMode (or undefined/null for "no assignment") into the
// same `play` param shape as encodePlayModeParam — the one place RoadmapPath/QuizPickerModal/
// the Course screen need to reach for turning an IQuizItemSummary.assignedPlayMode into a route
// param, so they don't each re-derive the JSON shape by hand.
export function encodeAssignedPlayMode(assigned: IAssignedPlayMode | null | undefined): string | undefined {
  return assigned ? encodePlayModeParam(assigned.id, assigned.settings) : undefined;
}
