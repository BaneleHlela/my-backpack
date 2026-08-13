// Course-wide quiz picker — opened from the "Quizzes" floating action button
// (CoursePathActions.tsx), which previously had no real destination ("Coming soon"; see
// CLAUDE.md's Course & Topic redesign Phase C entry). Two tabs, same Videos/Notes tab structure
// as ResourcesModal.tsx:
//
// - "Course Quizzes" — unchanged from the original single-list version: every quiz-type item
//   across the course's nodes, grouped by node title (same aggregation shape as
//   ResourcesModal's video grouping). Picking one hands off to the Quiz Mode Select screen
//   exactly as if it had been tapped directly on the path.
// - "Game Quizzes" — the same QuizModeGrid used by the full-screen QuizModeSelectScreen,
//   embedded directly in this tab. It targets the course's own auto-created mode:'pool'
//   practice quiz (`{source:'miniApp', miniAppId: courseId}` — the same shape Dictionary's
//   "Take Quiz" already uses, just pointed at the course instead), NOT a specific roadmap item —
//   every question scoped to the course is fair game, regardless of which node's quiz (if any)
//   it's also attached to. Since the grid *is* the mode-select step already, starting from here
//   skips straight to the session route (`/quiz/dictionary/[miniAppId]`), not back through
//   `/quiz/modes/[itemId]`. `settingsAdjustable: true` here — the pool quiz is seeded
//   isUserAdjustable:true, same as Dictionary's. If the pool is empty, QuizSessionScreen's
//   existing has-content empty state handles it once a mode is tapped — this tab doesn't
//   pre-check, unlike the Course Quizzes tab which just lists what's already known locally.
//
// No Figma frame exists for this modal (only ResourcesModal/LessonModal's sibling frames do) —
// styled to match those two rather than pulled from a design file. See
// docs/technical/mobile-architecture.md's "Quiz Modes" section.
//
// Unfiltered by lock status on the Course Quizzes tab, matching ResourcesModal's own precedent
// of aggregating across the whole course regardless of per-node unlock state — this is a
// browse/overview list, not a gate. Selecting a locked quiz still opens the ordinary Quiz Mode
// Select flow; the roadmap's own item-start endpoint remains the actual gate server-side.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardCheck, Gamepad2, Lock, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { NodeItemWithProgress, RoadmapWithProgress } from '@my-backpack/shared';
import { QuizModeGrid } from '../quiz/QuizModeGrid';
import { encodePlayModeParam, type QuizPlayModeId, type QuizPlayModeSettings } from '../quiz/quizPlayModes';
import { useTheme } from '../../theme/ThemeContext';

interface QuizPickerModalProps {
  roadmap: RoadmapWithProgress;
  courseId: string;
  courseName: string;
  subjectSlug: string;
  courseSlug: string;
  onClose: () => void;
}

type Tab = 'course' | 'game';
type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function QuizPickerModal({
  roadmap,
  courseId,
  courseName,
  subjectSlug,
  courseSlug,
  onClose,
}: QuizPickerModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('course');

  const groups = roadmap.nodes
    .map((node) => {
      const items = node.items as unknown as NodeItemWithProgress[];
      const quizzes = items.filter(
        (item): item is Extract<NodeItemWithProgress, { itemType: 'quiz' }> => item.itemType === 'quiz'
      );
      return { nodeId: node._id, title: node.title, quizzes };
    })
    .filter((g) => g.quizzes.length > 0);

  const goToModeSelect = (itemId: string, nodeId: string) => {
    onClose();
    router.push({
      pathname: '/quiz/modes/[itemId]',
      params: { itemId, nodeId, subjectSlug, courseSlug },
    });
  };

  // The grid already *is* the mode-select step, so this goes straight to the session route.
  const startGameMode = (modeId: QuizPlayModeId, settings: QuizPlayModeSettings) => {
    onClose();
    router.push({
      pathname: '/quiz/dictionary/[miniAppId]',
      params: { miniAppId: courseId, name: courseName, play: encodePlayModeParam(modeId, settings) },
    });
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={20} color={colors.text.muted} />
          </Pressable>

          <View style={styles.tabBar}>
            <Pressable style={styles.tabButton} onPress={() => setTab('course')}>
              <ClipboardCheck size={22} color={tab === 'course' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'course' && { color: colors.primary.DEFAULT }]}>
                Course Quizzes
              </Text>
            </Pressable>
            <View style={styles.tabDivider} />
            <Pressable style={styles.tabButton} onPress={() => setTab('game')}>
              <Gamepad2 size={22} color={tab === 'game' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'game' && { color: colors.primary.DEFAULT }]}>
                Game Quizzes
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {tab === 'course' ? (
              groups.length === 0 ? (
                <Text style={styles.emptyText}>No quizzes available for this course yet.</Text>
              ) : (
                groups.map((group) => (
                  <View key={group.nodeId} style={styles.group}>
                    <Text style={styles.groupHeading} numberOfLines={1}>
                      {group.title}
                    </Text>
                    {group.quizzes.map((item) => (
                      <Pressable
                        key={item.itemId}
                        onPress={() => goToModeSelect(item.itemId, group.nodeId)}
                        style={styles.row}
                      >
                        <View style={styles.rowIcon}>
                          <ClipboardCheck size={18} color={colors.primary.DEFAULT} />
                        </View>
                        <View style={styles.rowTextWrap}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {item.quiz.title}
                          </Text>
                          <Text style={styles.rowSubtitle}>{item.quiz.questionCount} questions</Text>
                        </View>
                        {!item.isUnlocked && <Lock size={16} color={colors.text.faint} />}
                      </Pressable>
                    ))}
                  </View>
                ))
              )
            ) : (
              <QuizModeGrid settingsAdjustable onStart={startGameMode} />
            )}
          </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.md,
    },
    group: {
      gap: spacing.sm,
    },
    groupHeading: {
      fontFamily: 'Fredoka_500Medium',
      fontSize: typography.small,
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.surface.glassSoft,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.glassStrong,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowTitle: {
      fontFamily: 'Fredoka_500Medium',
      fontSize: typography.body,
      color: colors.text.primary,
    },
    rowSubtitle: {
      fontFamily: 'Fredoka_400Regular',
      fontSize: typography.small,
      color: colors.text.muted,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: typography.small,
      color: colors.text.muted,
      paddingVertical: spacing.lg,
    },
  });
}
