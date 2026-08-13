// Thin wrapper — Quiz Mode Select screen for Dictionary's "Take Quiz" entry point, inserted
// ahead of the existing quiz/dictionary/[miniAppId] session route (untouched). Root-level,
// mirrors quiz/modes/[itemId].tsx — see docs/technical/mobile-architecture.md's "Quiz Modes"
// section.
import { useLocalSearchParams } from 'expo-router';
import { QuizModeSelectScreen } from '../../../../src/components/quiz/QuizModeSelectScreen';

export default function QuizModesForDictionaryScreen() {
  const { miniAppId, name } = useLocalSearchParams<{ miniAppId: string; name?: string }>();

  return (
    <QuizModeSelectScreen
      target={{ source: 'miniApp', miniAppId, title: name }}
      backLabel={name ?? 'Dictionary'}
    />
  );
}
