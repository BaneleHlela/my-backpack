// Thin wrapper — full-screen quiz-taking route for a roadmap quiz item. Root-level, sibling of
// (app)/(auth)/select-profile/profile-setup (see docs/technical/mobile-architecture.md's
// "Roadmap, Lesson & Quiz UI" section for why). All session-lifecycle/question-rendering logic
// lives in the shared QuizSessionScreen, which also backs quiz/dictionary/[miniAppId].tsx.
import { useLocalSearchParams } from 'expo-router';
import { QuizSessionScreen } from '../../src/components/quiz/QuizSessionScreen';

export default function QuizItemScreen() {
  const { itemId, nodeId, subjectSlug, courseSlug } = useLocalSearchParams<{
    itemId: string;
    nodeId: string;
    subjectSlug: string;
    courseSlug: string;
  }>();

  return (
    <QuizSessionScreen
      session={{ source: 'roadmapItem', nodeId, itemId, subjectSlug, courseSlug }}
    />
  );
}
