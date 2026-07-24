// Thin wrapper — full-screen quiz-taking route for a mini-app's default Quiz (Dictionary's
// "Take Quiz" entry point). Root-level, sibling of quiz/[itemId] — see
// docs/technical/mobile-architecture.md for why quiz routes live at the root rather than
// nested in (app). All session-lifecycle/question-rendering logic lives in the shared
// QuizSessionScreen.
import { useLocalSearchParams } from 'expo-router';
import { QuizSessionScreen } from '../../../src/components/quiz/QuizSessionScreen';

export default function DictionaryQuizScreen() {
  const { miniAppId, name } = useLocalSearchParams<{ miniAppId: string; name?: string }>();

  return <QuizSessionScreen session={{ source: 'miniApp', miniAppId, title: name }} />;
}
