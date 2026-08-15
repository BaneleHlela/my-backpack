// Thin wrapper — Quiz Mode Select screen for Dictionary's "Take Quiz" entry point (and, via
// QuizPickerModal's "Game Quizzes" tab, a course's auto-created practice pool too), inserted
// ahead of the existing quiz/dictionary/[miniAppId] session route (untouched). Root-level — see
// docs/technical/mobile-architecture.md's "Quiz Modes" section. QuizModeSelectScreen is
// miniApp-only now (a Topic quiz's teacher-assigned mode, if any, skips this screen entirely —
// see that component's module comment).
import { useLocalSearchParams } from 'expo-router';
import { QuizModeSelectScreen } from '../../../../src/components/quiz/QuizModeSelectScreen';

export default function QuizModesForDictionaryScreen() {
  const { miniAppId, name } = useLocalSearchParams<{ miniAppId: string; name?: string }>();

  return <QuizModeSelectScreen target={{ miniAppId, title: name }} backLabel={name ?? 'Dictionary'} />;
}
