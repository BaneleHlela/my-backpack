// Thin wrapper — AI Helper chat route. All real UI/state lives in AiHelperChatScreen.
import { useLocalSearchParams } from 'expo-router';
import { AiHelperChatScreen } from '../../../../../../../src/components/course/AiHelperChatScreen';

export default function AiHelperChatRoute() {
  const { courseId, courseName } = useLocalSearchParams<{
    courseId: string;
    courseName: string;
  }>();

  return <AiHelperChatScreen courseId={courseId} courseName={courseName} />;
}
