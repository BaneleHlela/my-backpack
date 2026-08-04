// Full-height modal for a single lesson's study material — Course & Topic redesign, Phase C.
// Replaces the old dedicated lesson/[lessonId].tsx route + auto-advance flow: the whole path is
// visible on the Course screen now, so completing a lesson just closes this modal and returns to
// the path rather than auto-navigating to the next item. Ports the Figma "Lesson Modal" frame
// (file OaE5PxSOT5p8Fby7SUpoP7, node 54:1739/54:1763): drag handle, Videos/Notes tab switcher,
// heading, video card(s), "Mark As Completed" button (violet/dark, exact Figma colour).
//
// Notes tab has no real content or authoring path yet — Figma only designed the Videos state, so
// this is a placeholder ("No available notes for this lesson." + a disabled "Add notes" button),
// not a built-out notes UI.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, Video, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { ApiResponse, ItemCompletionResult } from '@my-backpack/shared';
import api from '../../lib/api';
import { fetchLesson, clearLesson } from '../../features/roadmap/roadmapSlice';
import { LessonVideo } from '../lesson/LessonVideo';
import { PrimaryButton } from '../PrimaryButton';
import type { AppDispatch, RootState } from '../../store/store';
import { useTheme } from '../../theme/ThemeContext';

interface LessonModalProps {
  lessonId: string;
  onClose: () => void;
  onCompleted: () => void;
}

type Tab = 'videos' | 'notes';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function LessonModal({ lessonId, onClose, onCompleted }: LessonModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const { currentLesson, isLoading } = useSelector((state: RootState) => state.roadmap);
  const [tab, setTab] = useState<Tab>('videos');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    dispatch(fetchLesson(lessonId));
    return () => {
      dispatch(clearLesson());
    };
  }, [dispatch, lessonId]);

  const handleMarkCompleted = async () => {
    setCompleting(true);
    try {
      await api.post<ApiResponse<ItemCompletionResult>>(`/roadmap/lesson/${lessonId}/study`);
      onCompleted();
      onClose();
    } catch {
      // ignore — let the learner retry
    } finally {
      setCompleting(false);
    }
  };

  const videoResources = currentLesson
    ? [...currentLesson.resources].filter((r) => r.type === 'video').sort((a, b) => a.position - b.position)
    : [];

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={20} color={colors.text.muted} />
          </Pressable>

          <View style={styles.tabBar}>
            <Pressable style={styles.tabButton} onPress={() => setTab('videos')}>
              <Video size={22} color={tab === 'videos' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'videos' && { color: colors.primary.DEFAULT }]}>Videos</Text>
            </Pressable>
            <View style={styles.tabDivider} />
            <Pressable style={styles.tabButton} onPress={() => setTab('notes')}>
              <BookOpen size={22} color={tab === 'notes' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'notes' && { color: colors.primary.DEFAULT }]}>Notes</Text>
            </Pressable>
          </View>

          {currentLesson ? (
            <Text style={styles.heading} numberOfLines={1}>
              {currentLesson.title}
            </Text>
          ) : null}

          {isLoading || !currentLesson ? (
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loading} />
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
              {tab === 'videos' ? (
                videoResources.length === 0 ? (
                  <Text style={styles.emptyText}>No videos available for this lesson.</Text>
                ) : (
                  videoResources.map((resource, i) =>
                    resource.url ? (
                      <LessonVideo
                        key={i}
                        url={resource.url}
                        caption={resource.caption}
                        thumbnailUrl={resource.thumbnailUrl}
                        description={resource.description}
                      />
                    ) : null
                  )
                )
              ) : (
                <View style={styles.notesEmpty}>
                  <Text style={styles.emptyText}>No available notes for this lesson.</Text>
                  <PrimaryButton title="Add notes" onPress={() => {}} disabled />
                </View>
              )}
            </ScrollView>
          )}

          <PrimaryButton
            title="Mark As Completed"
            onPress={() => void handleMarkCompleted()}
            loading={completing}
            style={styles.completeButton}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      height: '90%',
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    dragHandle: {
      alignSelf: 'center',
      width: 80,
      height: 5,
      borderRadius: radii.sm,
      backgroundColor: colors.text.secondary,
    },
    closeButton: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    tabDivider: {
      width: 1.5,
      height: 30,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.border,
    },
    tabLabel: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.text.muted,
    },
    heading: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    loading: {
      paddingVertical: spacing.xl,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: typography.small,
      color: colors.text.muted,
      paddingVertical: spacing.lg,
    },
    notesEmpty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    completeButton: {
      backgroundColor: colors.primary.dark,
    },
  });
}
