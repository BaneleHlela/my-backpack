// Ports apps/web's CoursePage.tsx: progress header + RoadmapPath + a quick-links row for the
// Course's linked MiniApps. Per Decision 9 in the mobile roadmap/quiz plan, the course is
// always already loaded in `coursesByKey` from the Subject screen (Home -> Subject -> Course
// is the only navigation path in this build, no course deep-linking) — no fallback fetch for
// missing course metadata. A separate fetchCourseDetail call still runs to populate
// course.miniAppIds (the list endpoint only returns plain id strings — see contentSlice.ts).
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IMiniApp } from '@my-backpack/shared';
import { fetchCourseDetail } from '../../../../../../src/features/content/contentSlice';
import { fetchRoadmapByCourse } from '../../../../../../src/features/roadmap/roadmapSlice';
import RoadmapPath from '../../../../../../src/components/roadmap/RoadmapPath';
import type { AppDispatch, RootState } from '../../../../../../src/store/store';

const MINI_APP_EMOJI: Record<string, string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
};

type LinkedMiniApp = Pick<IMiniApp, '_id' | 'name' | 'slug' | 'type' | 'description'>;

export default function CourseScreen() {
  const { subjectSlug, courseSlug } = useLocalSearchParams<{ subjectSlug: string; courseSlug: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { enrolledSubjects, coursesByKey, courseDetailByKey } = useSelector(
    (state: RootState) => state.content
  );
  const { currentRoadmap, isLoading, error } = useSelector((state: RootState) => state.roadmap);
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);

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

  const ageGroup: AgeGroup = activeProfile?.ageGroup ?? 'adult';

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
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={18} color={colors.text.secondary} />
        <Text style={styles.backText}>{subjectName || 'Back'}</Text>
      </Pressable>

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
            ageGroup={ageGroup}
            subjectSlug={subjectSlug}
            courseSlug={courseSlug}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: typography.small,
    color: colors.text.secondary,
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
    paddingHorizontal: spacing.sm,
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
