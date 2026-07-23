// Ports apps/web's LessonPlayerPage.tsx: resource-hub player rendering ILesson.resources[]
// sorted by position, one block per type. Marking complete auto-advances to the next item
// (lesson or quiz) after a brief pause, falling back to the roadmap overview when there's no
// next item in the node. Auto-advance uses router.replace (doesn't grow the nav stack as the
// learner moves lesson-to-lesson/quiz); the manual "Back to roadmap" row uses router.back(),
// which always lands on the Course screen regardless of how many auto-advances happened since,
// because replace() never touches history entries below the current one.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { ApiResponse, ItemCompletionResult } from '@my-backpack/shared';
import api from '../../../../../../../src/lib/api';
import { playAudioUrl } from '../../../../../../../src/lib/audio';
import { fetchLesson, clearLesson } from '../../../../../../../src/features/roadmap/roadmapSlice';
import { LessonVideo } from '../../../../../../../src/components/lesson/LessonVideo';
import { SteppedNotesViewer } from '../../../../../../../src/components/lesson/SteppedNotesViewer';
import { markdownStyles } from '../../../../../../../src/components/lesson/markdownStyles';
import type { AppDispatch, RootState } from '../../../../../../../src/store/store';

const AUTO_ADVANCE_DELAY_MS = 1500;

export default function LessonPlayerScreen() {
  const { subjectSlug, courseSlug, lessonId } = useLocalSearchParams<{
    subjectSlug: string;
    courseSlug: string;
    lessonId: string;
  }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { currentLesson, isLoading } = useSelector((state: RootState) => state.roadmap);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  const [nextItem, setNextItem] = useState<ItemCompletionResult | null>(null);

  useEffect(() => {
    if (lessonId) dispatch(fetchLesson(lessonId));
    return () => {
      dispatch(clearLesson());
    };
  }, [dispatch, lessonId]);

  const handleMarkComplete = async () => {
    if (!lessonId || !currentLesson) return;
    setCompleting(true);
    try {
      const res = await api.post<ApiResponse<ItemCompletionResult>>(`/roadmap/lesson/${lessonId}/study`);
      const result = res.data.data;
      setDone(true);
      setNextItem(result);
      setTimeout(() => {
        if (result.nextItemId && result.nextItemType === 'lesson') {
          router.replace({
            pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]/lesson/[lessonId]',
            params: { subjectSlug, courseSlug, lessonId: result.nextItemId },
          });
        } else if (result.nextItemId && result.nextItemType === 'quiz') {
          router.replace({
            pathname: '/quiz/[itemId]',
            params: { itemId: result.nextItemId, nodeId: currentLesson.nodeId, subjectSlug, courseSlug },
          });
        } else {
          router.replace({
            pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]',
            params: { subjectSlug, courseSlug },
          });
        }
      }, AUTO_ADVANCE_DELAY_MS);
    } catch {
      // ignore — let the user retry
    } finally {
      setCompleting(false);
    }
  };

  if (isLoading || !currentLesson) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  }

  const sortedResources = [...currentLesson.resources].sort((a, b) => a.position - b.position);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={18} color={colors.text.secondary} />
        <Text style={styles.backText}>Back to roadmap</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.badge}>Study</Text>
        <Text style={styles.title}>{currentLesson.title}</Text>
      </View>

      <View style={styles.resources}>
        {sortedResources.length === 0 ? (
          <Text style={styles.emptyText}>No study material available for this lesson.</Text>
        ) : (
          sortedResources.map((resource, i) => {
            switch (resource.type) {
              case 'video':
                return resource.url ? (
                  <LessonVideo key={i} url={resource.url} caption={resource.caption} />
                ) : null;
              case 'image':
                return resource.url ? (
                  <View key={i} style={styles.imageBlock}>
                    <Image source={{ uri: resource.url }} style={styles.image} resizeMode="cover" />
                    {resource.caption ? <Text style={styles.caption}>{resource.caption}</Text> : null}
                  </View>
                ) : null;
              case 'audio':
                return resource.url ? (
                  <Pressable
                    key={i}
                    onPress={() => playAudioUrl(resource.url!)}
                    style={styles.audioRow}
                  >
                    <Text style={styles.audioButtonText}>▶ Play audio</Text>
                    {resource.caption ? <Text style={styles.caption}>{resource.caption}</Text> : null}
                  </Pressable>
                ) : null;
              case 'notes':
                return (
                  <View key={i}>
                    <Markdown style={markdownStyles}>{resource.markdown ?? ''}</Markdown>
                  </View>
                );
              case 'steps':
                return <SteppedNotesViewer key={i} steps={resource.steps ?? []} />;
              case 'pdf':
                return resource.url ? (
                  <Pressable
                    key={i}
                    onPress={() => Linking.openURL(resource.url!)}
                    style={styles.pdfRow}
                  >
                    <Text style={styles.pdfText}>📄 {resource.title ?? 'Open PDF'}</Text>
                  </Pressable>
                ) : null;
              default:
                return null;
            }
          })
        )}
      </View>

      {!done ? (
        <Pressable
          onPress={() => void handleMarkComplete()}
          disabled={completing}
          style={[styles.completeButton, completing && styles.completeButtonDisabled]}
        >
          {completing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.completeButtonText}>Mark as complete</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.doneBlock}>
          <CheckCircle size={40} color={colors.success.DEFAULT} />
          <Text style={styles.doneTitle}>Lesson complete!</Text>
          <Text style={styles.doneSubtitle}>
            {nextItem?.nextItemId ? 'Moving to the next item…' : 'Returning to the roadmap…'}
          </Text>
        </View>
      )}
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
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  header: {
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.primary.dark,
    backgroundColor: colors.surface.glassSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  title: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  resources: {
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  imageBlock: {
    gap: spacing.xs,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
  },
  caption: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
  },
  audioButtonText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  pdfRow: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
  },
  pdfText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  completeButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#fff',
  },
  doneBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  doneTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  doneSubtitle: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
});
