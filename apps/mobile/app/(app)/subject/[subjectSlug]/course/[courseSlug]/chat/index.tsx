// Thin wrapper — Course Chat hub route. All real UI lives in CourseChatHubScreen.
// subjectSlug/courseSlug are needed to build the "AI Helper" tile's onward navigation;
// courseId/courseName are passed straight through from the course screen's button (see
// course/[courseSlug]/index.tsx) rather than re-derived from Redux here.
import { useLocalSearchParams } from 'expo-router';
import { CourseChatHubScreen } from '../../../../../../../src/components/course/CourseChatHubScreen';

export default function CourseChatHubRoute() {
  const { subjectSlug, courseSlug, courseId, courseName } = useLocalSearchParams<{
    subjectSlug: string;
    courseSlug: string;
    courseId: string;
    courseName: string;
  }>();

  return (
    <CourseChatHubScreen
      subjectSlug={subjectSlug}
      courseSlug={courseSlug}
      courseId={courseId}
      courseName={courseName}
    />
  );
}
