// Thin wrapper — full-screen quiz-taking route for a mini-app's default Quiz. Originally
// Dictionary's "Take Quiz" entry point only; now also backs a course's auto-created mode:'pool'
// practice quiz (mobile's Quiz Modes "Game Quizzes") — both are just `{source:'miniApp',
// miniAppId}` targets, `miniAppId` pointed at the Dictionary mini-app or a Course respectively.
// Root-level, sibling of quiz/[itemId] — see docs/technical/mobile-architecture.md for why quiz
// routes live at the root rather than nested in (app). All session-lifecycle/question-rendering
// logic lives in the shared QuizSessionScreen. The optional `play` param carries Quiz Modes
// gameplay mechanics — see quizPlayModes.ts's encode/parsePlayModeParam.
import { useLocalSearchParams } from 'expo-router';
import { QuizSessionScreen } from '../../../src/components/quiz/QuizSessionScreen';
import { parsePlayModeParam } from '../../../src/components/quiz/quizPlayModes';

export default function DictionaryQuizScreen() {
  const { miniAppId, name, play } = useLocalSearchParams<{ miniAppId: string; name?: string; play?: string }>();

  return (
    <QuizSessionScreen
      session={{ source: 'miniApp', miniAppId, title: name }}
      playMode={parsePlayModeParam(play)}
    />
  );
}
