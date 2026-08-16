// Ports apps/web's CoursePage.tsx: progress header + RoadmapPath + a quick-links row for the
// Course's linked MiniApps. Per Decision 9 in the mobile roadmap/quiz plan, the course used to
// always already be loaded in `coursesByKey` from the Subject screen (Home -> Subject -> Course
// was the only navigation path). Per-profile last-route resume (see (app)/_layout.tsx's
// RouteTracker) can now land here directly, so this screen also fetches `coursesByKey` itself
// when missing, same as the Subject screen does — see the fetchCoursesBySubject effect below.
// A separate fetchCourseDetail call still runs to populate course.miniAppIds (the list endpoint
// only returns plain id strings — see contentSlice.ts).
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../../../../src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IMiniApp } from '@my-backpack/shared';
import { fetchCourseDetail, fetchCoursesBySubject } from '../../../../../../src/features/content/contentSlice';
import { fetchRoadmapByCourse } from '../../../../../../src/features/roadmap/roadmapSlice';
import RoadmapPath from '../../../../../../src/components/roadmap/RoadmapPath';
import CoursePathActions from '../../../../../../src/components/roadmap/CoursePathActions';
import LessonModal from '../../../../../../src/components/course/LessonModal';
import ResourcesModal from '../../../../../../src/components/course/ResourcesModal';
import QuizPickerModal from '../../../../../../src/components/course/QuizPickerModal';
import { encodeAssignedPlayMode } from '../../../../../../src/components/quiz/quizPlayModes';
import { Menubar } from '../../../../../../src/components/Menubar';
import { GradientProgressBar } from '../../../../../../src/components/GradientProgressBar';
import { LaunchScreenBody } from '../../../../../../src/components/LaunchScreen';
import { ComingSoonOverlay } from '../../../../../../src/components/ComingSoonOverlay';
import type { AppDispatch, RootState } from '../../../../../../src/store/store';
import { useTheme } from '../../../../../../src/theme/ThemeContext';
import { fonts } from '../../../../../../src/theme/fonts';

const MINI_APP_EMOJI: Record<string, string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
};

type LinkedMiniApp = Pick<IMiniApp, '_id' | 'name' | 'slug' | 'type' | 'description'>;

export default function CourseScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subjectSlug, courseSlug } = useLocalSearchParams<{ subjectSlug: string; courseSlug: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { enrolledSubjects, coursesByKey, courseDetailByKey } = useSelector(
    (state: RootState) => state.content
  );
  const { currentRoadmap, isLoading, error } = useSelector((state: RootState) => state.roadmap);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  let fieldSlug = '';
  let subjectName = '';
  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      const found = subjects.find((s) => s.subject.slug === subjectSlug);
      if (found) {
        fieldSlug = field.slug;
        subjectName = found.subject.name;
        break;
      }
    }
  }

  const subjectKey = fieldSlug && subjectSlug ? `${fieldSlug}/${subjectSlug}` : '';
  const course = subjectKey ? coursesByKey[subjectKey]?.find((c) => c.slug === courseSlug) : undefined;
  const detailKey = subjectKey && courseSlug ? `${subjectKey}/${courseSlug}` : '';
  const courseDetail = detailKey ? courseDetailByKey[detailKey] : undefined;

  useEffect(() => {
    if (course?._id) {
      dispatch(fetchRoadmapByCourse(course._id));
    }
  }, [dispatch, course?._id]);

  useEffect(() => {
    if (!fieldSlug || !subjectSlug || !courseSlug) return;
    dispatch(fetchCourseDetail({ fieldSlug, subjectSlug, courseSlug }));
  }, [dispatch, fieldSlug, subjectSlug, courseSlug]);

  // Self-sufficient fallback for when this screen is entered directly (resumed last route)
  // rather than via the Subject screen, which is normally what populates coursesByKey.
  useEffect(() => {
    if (!fieldSlug || !subjectSlug || coursesByKey[subjectKey]) return;
    dispatch(fetchCoursesBySubject({ fieldSlug, subjectSlug }));
  }, [dispatch, fieldSlug, subjectSlug, subjectKey, coursesByKey]);

  const pct = currentRoadmap
    ? Math.round((currentRoadmap.completedItems / (currentRoadmap.totalItems || 1)) * 100)
    : 0;

  const linkedMiniApps: LinkedMiniApp[] =
    courseDetail && courseDetail.miniAppIds.length > 0 && typeof courseDetail.miniAppIds[0] !== 'string'
      ? (courseDetail.miniAppIds as LinkedMiniApp[])
      : [];

  if (!course) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Course not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <Menubar label={subjectName || 'Back'} onBackPress={() => router.back()} />

        <View style={styles.headerRow}>
            <Text style={styles.heading} numberOfLines={1}>
              {course.name}
            </Text>
            {currentRoadmap && (
              <View style={styles.progressSection}>
                <Text style={styles.progressPercent}>{pct}%</Text>
                <GradientProgressBar progress={pct} height={7} />
              </View>
            )}
        </View>
        {course.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {course.description}
          </Text>
        ) : null}

        {linkedMiniApps.length > 0 && (
          <View style={styles.linksRow}>
            {linkedMiniApps.map((app) => (
              <Pressable
                key={app._id}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/miniapp/[miniAppId]',
                    params: { miniAppId: app._id, name: app.name, type: app.type },
                  })
                }
                style={styles.linkChip}
              >
                <Text style={styles.linkChipEmoji}>{MINI_APP_EMOJI[app.type] ?? '📦'}</Text>
                <Text style={styles.linkChipText}>{app.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.roadmapSection}>
          {isLoading && !currentRoadmap ? (
            <View style={styles.roadmapLoading}>
              <LaunchScreenBody />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Could not load roadmap.</Text>
              <Text style={styles.errorDetail}>{error}</Text>
            </View>
          ) : currentRoadmap && currentRoadmap.nodes.length === 0 ? (
            <Text style={styles.emptyText}>No lessons available yet.</Text>
          ) : currentRoadmap && currentRoadmap.nodes.length > 0 ? (
            <RoadmapPath
              roadmap={currentRoadmap}
              onSelectLesson={(lessonId) => setActiveLessonId(lessonId)}
              onSelectQuiz={(itemId, nodeId, assignedPlayMode) =>
                router.push({
                  // Topic quizzes never show Quiz Mode Select — a teacher assigns at most one
                  // specific mode from Content Studio (Quiz.assignedPlayMode), which starts the
                  // session straight into that mode's gameplay with no choice for the learner.
                  pathname: '/quiz/[itemId]',
                  params: { itemId, nodeId, subjectSlug, courseSlug, play: encodeAssignedPlayMode(assignedPlayMode) },
                })
              }
            />
          ) : null}
        </View>
      </ScrollView>

      {currentRoadmap && (
        <CoursePathActions
          onResourcesPress={() => setShowResourcesModal(true)}
          onQuizzesPress={() => setShowQuizPicker(true)}
          onMiniAppsPress={() => setComingSoon('Mini-apps')}
          onChatPress={() =>
            router.push({
              pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]/chat',
              params: { subjectSlug, courseSlug, courseId: course._id, courseName: course.name },
            })
          }
        />
      )}

      {activeLessonId && (
        <LessonModal
          lessonId={activeLessonId}
          onClose={() => setActiveLessonId(null)}
          onCompleted={() => dispatch(fetchRoadmapByCourse(course._id))}
        />
      )}

      {showResourcesModal && currentRoadmap && (
        <ResourcesModal roadmap={currentRoadmap} onClose={() => setShowResourcesModal(false)} />
      )}

      {showQuizPicker && currentRoadmap && (
        <QuizPickerModal
          roadmap={currentRoadmap}
          courseId={course._id}
          courseName={course.name}
          subjectSlug={subjectSlug}
          courseSlug={courseSlug}
          onClose={() => setShowQuizPicker(false)}
        />
      )}

      {comingSoon && <ComingSoonOverlay label={comingSoon} onDismiss={() => setComingSoon(null)} />}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 160,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  backLink: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  // "min-w-[25%]"/"max 50%" from the design brief — the name+progress column shrinks with a
  // long course name but never drops below a quarter of the header row's width.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  headerCol: {
    minWidth: '25%',
    maxWidth: '50%',
    gap: spacing.xs,
  },
  heading: {
    maxWidth: '75%',
    fontFamily: fonts.display.bold,
    fontSize: typography.headingLg - 2,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  progressSection: {
    gap: 2,
    marginTop: spacing.xs,
  },
  progressPercent: {
    minWidth: '25%',
    fontSize: typography.small,
    fontFamily: fonts.display.semibold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  linkChipEmoji: {
    fontSize: typography.body,
  },
  linkChipText: {
    fontSize: typography.small,
    color: colors.text.primary,
  },
  roadmapSection: {
    marginTop: spacing.sm,
  },
  roadmapLoading: {
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  errorDetail: {
    fontSize: typography.small,
    color: colors.error.dark,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.small,
    color: colors.text.muted,
    paddingVertical: spacing.xl,
  },
  });
}
