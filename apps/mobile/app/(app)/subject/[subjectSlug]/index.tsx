// Ports apps/web's SubjectHomePage.tsx's content (not its layout — no collapsible
// side panel here, just two stacked sections): Courses as the primary list, Subject-level
// MiniApps (e.g. Dictionary) as a secondary section below. fieldSlug/subjectId aren't in
// this route's params (mirrors web's /subject/:subjectSlug, which carries no :fieldSlug
// segment either) — both are resolved by matching subjectSlug against the already-loaded
// enrolledSubjects list, exactly like web's SubjectHomePage/CoursePage do.
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, Map } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { IMiniApp } from '@my-backpack/shared';
import { GlassCard } from '../../../../src/components/GlassCard';
import { fetchCoursesBySubject, fetchSubjectMiniApps } from '../../../../src/features/content/contentSlice';
import type { AppDispatch, RootState } from '../../../../src/store/store';

const MINI_APP_EMOJI: Record<IMiniApp['type'], string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
};

export default function SubjectHomeScreen() {
  const { subjectSlug } = useLocalSearchParams<{ subjectSlug: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { enrolledSubjects, coursesByKey, miniAppsBySubject, isLoadingCourses } = useSelector(
    (state: RootState) => state.content
  );

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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={18} color={colors.text.secondary} />
        <Text style={styles.backText}>{fieldName || 'Back'}</Text>
      </Pressable>

      <Text style={styles.heading}>{subjectName || subjectSlug}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Courses</Text>
        {isLoadingCourses && courses.length === 0 ? (
          <ActivityIndicator color={colors.primary.DEFAULT} style={styles.sectionLoading} />
        ) : courses.length === 0 ? (
          <Text style={styles.comingSoon}>No courses available yet.</Text>
        ) : (
          courses.map((course) => (
            <Pressable
              key={course._id}
              onPress={() =>
                router.push({
                  pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]',
                  params: { subjectSlug, courseSlug: course.slug },
                })
              }
            >
              <GlassCard style={styles.courseCard}>
                <View style={styles.courseIcon}>
                  <Map size={22} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  {course.description ? (
                    <Text style={styles.courseDescription} numberOfLines={2}>
                      {course.description}
                    </Text>
                  ) : null}
                  <Text style={styles.courseMeta}>
                    {course.roadmap.nodeCount} topic{course.roadmap.nodeCount === 1 ? '' : 's'}
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Mini-Apps</Text>
        {miniApps === undefined ? (
          <ActivityIndicator color={colors.primary.DEFAULT} style={styles.sectionLoading} />
        ) : miniApps.length === 0 ? (
          <Text style={styles.comingSoon}>More coming soon.</Text>
        ) : (
          miniApps.map((app) => (
            <Pressable
              key={app._id}
              onPress={() =>
                router.push({
                  pathname: '/(app)/miniapp/[miniAppId]',
                  params: { miniAppId: app._id, name: app.name, type: app.type },
                })
              }
            >
              <GlassCard style={styles.miniAppCard}>
                <Text style={styles.miniAppEmoji}>{MINI_APP_EMOJI[app.type] ?? '📦'}</Text>
                <Text style={styles.miniAppName}>{app.name}</Text>
              </GlassCard>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  heading: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.body,
    fontWeight: '700',
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
  courseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.glassSoft,
  },
  courseInfo: {
    flex: 1,
    gap: 2,
  },
  courseName: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  courseDescription: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  courseMeta: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  miniAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  miniAppEmoji: {
    fontSize: typography.heading,
  },
  miniAppName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
