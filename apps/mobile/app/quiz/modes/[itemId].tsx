// Thin wrapper — Quiz Mode Select screen for a roadmap quiz item, inserted ahead of the
// existing quiz/[itemId] session route (untouched — see docs/technical/mobile-architecture.md's
// "Quiz Modes" section for why this is a new sibling route rather than a restructure of the
// existing one). Root-level, alongside quiz/[itemId] and quiz/dictionary/[miniAppId] — same
// fullScreenModal registration reasoning applies (see app/_layout.tsx).
import { useLocalSearchParams } from 'expo-router';
import { QuizModeSelectScreen } from '../../../src/components/quiz/QuizModeSelectScreen';

export default function QuizModesForItemScreen() {
  const { itemId, nodeId, subjectSlug, courseSlug } = useLocalSearchParams<{
    itemId: string;
    nodeId: string;
    subjectSlug: string;
    courseSlug: string;
  }>();

  return (
    <QuizModeSelectScreen
      target={{ source: 'roadmapItem', nodeId, itemId, subjectSlug, courseSlug }}
      backLabel="Course"
    />
  );
}
