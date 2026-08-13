// Thin wrapper — full-screen quiz-taking route for a roadmap quiz item. Root-level, sibling of
// (app)/(auth)/select-profile/profile-setup (see docs/technical/mobile-architecture.md's
// "Roadmap, Lesson & Quiz UI" section for why). All session-lifecycle/question-rendering logic
// lives in the shared QuizSessionScreen, which also backs quiz/dictionary/[miniAppId].tsx.
// The optional `play` param (JSON-encoded mode + settings, set by QuizModeSelectScreen when the
// learner starts a mode) carries Quiz Modes gameplay mechanics — see quizPlayModes.ts's
// encode/parsePlayModeParam and QuizSessionScreen's module comment.
import { useLocalSearchParams } from 'expo-router';
import { QuizSessionScreen } from '../../src/components/quiz/QuizSessionScreen';
import { parsePlayModeParam } from '../../src/components/quiz/quizPlayModes';

export default function QuizItemScreen() {
  const { itemId, nodeId, subjectSlug, courseSlug, play } = useLocalSearchParams<{
    itemId: string;
    nodeId: string;
    subjectSlug: string;
    courseSlug: string;
    play?: string;
  }>();

  return (
    <QuizSessionScreen
      session={{ source: 'roadmapItem', nodeId, itemId, subjectSlug, courseSlug }}
      playMode={parsePlayModeParam(play)}
    />
  );
}
