// Ports apps/web's SubjectHomePage.tsx's content (not its layout — no collapsible
// side panel here, just two stacked sections). Restyled August 2026: Mini-Apps grid moved to
// the TOP (2-column pastel grid, channels ideal_design_example3.webp's first phone), Courses
// below as colorful gradient cards (GradientListCard, channels subjects_example_2.webp) each
// showing a real completed/total progress bar — see roadmapSlice.ts's `courseProgressById`
// module comment for why that's a per-card fetch of the existing roadmap-detail endpoint rather
// than a new backend field. fieldSlug/subjectId aren't in this route's params (mirrors web's
// /subject/:subjectSlug, which carries no :fieldSlug segment either) — both are resolved by
// matching subjectSlug against the already-loaded enrolledSubjects list, exactly like web's
// SubjectHomePage/CoursePage do.
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../../src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { spacing, typography } from '@my-backpack/shared';
import type { IMiniApp } from '@my-backpack/shared';
import { GradientListCard } from '../../../../src/components/GradientListCard';
import { MiniAppGridCard } from '../../../../src/components/MiniAppGridCard';
import { Menubar } from '../../../../src/components/Menubar';
import { fetchCoursesBySubject, fetchSubjectMiniApps } from '../../../../src/features/content/contentSlice';
import { fetchRoadmapByCourse } from '../../../../src/features/roadmap/roadmapSlice';
import type { AppDispatch, RootState } from '../../../../src/store/store';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fonts } from '../../../../src/theme/fonts';

const MINI_APP_EMOJI: Record<IMiniApp['type'], string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
};

export default function SubjectHomeScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subjectSlug } = useLocalSearchParams<{ subjectSlug: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { enrolledSubjects, coursesByKey, miniAppsBySubject, isLoadingCourses } = useSelector(
    (state: RootState) => state.content
  );
  const { courseProgressById } = useSelector((state: RootState) => state.roadmap);

  let fieldSlug = '';
  let fieldName = '';
  let subjectId = '';
  let subjectName = '';

  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      const found = subjects.find((s) => s.subject.slug === subjectSlug);
      if (found) {
        fieldSlug = field.slug;
        fieldName = field.name;
        subjectId = found.subject._id;
        subjectName = found.subject.name;
        break;
      }
    }
  }

  const subjectKey = fieldSlug && subjectSlug ? `${fieldSlug}/${subjectSlug}` : '';
  const courses = subjectKey ? (coursesByKey[subjectKey] ?? []) : [];
  const miniApps = subjectId ? miniAppsBySubject[subjectId] : undefined;

  useEffect(() => {
    if (!fieldSlug || !subjectSlug) return;
    dispatch(fetchCoursesBySubject({ fieldSlug, subjectSlug }));
  }, [dispatch, fieldSlug, subjectSlug]);

  useEffect(() => {
    if (!fieldSlug || !subjectSlug || !subjectId) return;
    dispatch(fetchSubjectMiniApps({ fieldSlug, subjectSlug, subjectId }));
  }, [dispatch, fieldSlug, subjectSlug, subjectId]);

  // Fire-and-forget per course, purely to populate roadmapSlice's courseProgressById cache for
  // this card's progress bar — subjects have 1-3 courses today, so this is cheap. Doesn't touch
  // currentRoadmap (CourseScreen's own slot), and only re-fires when the course list changes.
  useEffect(() => {
    courses.forEach((course) => {
      if (!courseProgressById[course._id]) {
        dispatch(fetchRoadmapByCourse(course._id));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, courses]);

  return (
    <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
      <Menubar label={fieldName || 'Back'} onBackPress={() => router.back()} />

      <Text style={styles.heading}>{subjectName || subjectSlug}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Mini-Apps</Text>
        {miniApps === undefined ? (
          <ActivityIndicator color={colors.primary.DEFAULT} style={styles.sectionLoading} />
        ) : miniApps.length === 0 ? (
          <Text style={styles.comingSoon}>More coming soon.</Text>
        ) : (
          <View style={styles.miniAppGrid}>
            {miniApps.map((app, index) => (
              <MiniAppGridCard
                key={app._id}
                name={app.name}
                emoji={MINI_APP_EMOJI[app.type] ?? '📦'}
                accentIndex={index}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/miniapp/[miniAppId]',
                    params: { miniAppId: app._id, name: app.name, type: app.type },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Courses</Text>
        {isLoadingCourses && courses.length === 0 ? (
          <ActivityIndicator color={colors.primary.DEFAULT} style={styles.sectionLoading} />
        ) : courses.length === 0 ? (
          <Text style={styles.comingSoon}>No courses available yet.</Text>
        ) : (
          <View style={styles.courseList}>
            {courses.map((course, index) => {
              const progress = courseProgressById[course._id];
              return (
                <GradientListCard
                  key={course._id}
                  title={course.name}
                  subtitle={`${course.roadmap.nodeCount} topic${course.roadmap.nodeCount === 1 ? '' : 's'}`}
                  progress={progress ? { completed: progress.completedItems, total: progress.totalItems } : undefined}
                  accentIndex={index}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]',
                      params: { subjectSlug, courseSlug: course.slug },
                    })
                  }
                />
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  heading: {
    fontFamily: fonts.display.bold,
    fontSize: typography.headingLg,
    color: colors.text.primary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.display.semibold,
    fontSize: typography.body,
    color: colors.text.primary,
  },
  sectionLoading: {
    alignSelf: 'flex-start',
  },
  comingSoon: {
    fontSize: typography.small,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  miniAppGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  courseList: {
    gap: spacing.sm,
  },
  });
}
