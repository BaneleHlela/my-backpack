// Ports apps/web's CoursePage.tsx: progress header + RoadmapPath + a quick-links row for the
// Course's linked MiniApps. Per Decision 9 in the mobile roadmap/quiz plan, the course used to
// always already be loaded in `coursesByKey` from the Subject screen (Home -> Subject -> Course
// was the only navigation path). Per-profile last-route resume (see (app)/_layout.tsx's
// RouteTracker) can now land here directly, so this screen also fetches `coursesByKey` itself
// when missing, same as the Subject screen does — see the fetchCoursesBySubject effect below.
// A separate fetchCourseDetail call still runs to populate course.miniAppIds (the list endpoint
// only returns plain id strings — see contentSlice.ts).
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { Menubar } from '../../../../../../src/components/Menubar';
import type { AppDispatch, RootState } from '../../../../../../src/store/store';
import { useTheme } from '../../../../../../src/theme/ThemeContext';

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
      <ScrollView contentContainerStyle={styles.content}>
        <Menubar label={subjectName || 'Back'} onBackPress={() => router.back()} />

        <Text style={styles.heading}>{course.name}</Text>
        {course.description ? <Text style={styles.description}>{course.description}</Text> : null}

        {currentRoadmap && (
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              {currentRoadmap.completedItems} of {currentRoadmap.totalItems} items complete ·{' '}
              <Text style={styles.progressPercent}>{pct}% done</Text>
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        )}

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
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loading} />
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
              onSelectQuiz={(itemId, nodeId, allowPlayModes) =>
                router.push({
                  // Topic quizzes skip Quiz Mode Select unless a teacher opted this specific
                  // quiz in via Content Studio — see Quiz.allowPlayModes.
                  pathname: allowPlayModes ? '/quiz/modes/[itemId]' : '/quiz/[itemId]',
                  params: { itemId, nodeId, subjectSlug, courseSlug },
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

      {comingSoon && (
        <Pressable style={styles.comingSoonOverlay} onPress={() => setComingSoon(null)}>
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonText}>{comingSoon} coming soon.</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 160,
    gap: spacing.md,
  },
  comingSoonOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonCard: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  comingSoonText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.primary,
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
  heading: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.small,
    color: colors.text.secondary,
    marginTop: -spacing.xs,
  },
  progressSection: {
    gap: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  progressPercent: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.glassSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary.DEFAULT,
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
  loading: {
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
