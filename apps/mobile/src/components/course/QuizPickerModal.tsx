// Course-wide quiz picker — opened from the "Quizzes" floating action button
// (CoursePathActions.tsx), which previously had no real destination ("Coming soon"; see
// CLAUDE.md's Course & Topic redesign Phase C entry). Two tabs, same Videos/Notes tab structure
// as ResourcesModal.tsx:
//
// - "Course Quizzes" — unchanged from the original single-list version: every quiz-type item
//   across the course's nodes, grouped by node title (same aggregation shape as
//   ResourcesModal's video grouping). Picking one hands off exactly as if it had been tapped
//   directly on the path: straight into the ordinary session route, carrying the teacher's
//   assigned mode (`Quiz.assignedPlayMode`) if one was set in Content Studio — Topic quizzes
//   never show a mode-selection screen; the learner just plays.
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
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { useRouter } from 'expo-router';
import { ClipboardCheck, Gamepad2, History, Lock, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IQuizItemSummary, NodeItemWithProgress, RoadmapWithProgress } from '@my-backpack/shared';
import { QuizModeGrid } from '../quiz/QuizModeGrid';
import { encodeAssignedPlayMode, encodePlayModeParam, type QuizPlayModeId, type QuizPlayModeSettings } from '../quiz/quizPlayModes';
import { PaddedButton } from '../PaddedButton';
import { getAccent } from '../../theme/accentPalette';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';

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

  // Topic quizzes never show Quiz Mode Select — same rule as tapping the item directly on the
  // path (see Quiz.assignedPlayMode). The teacher's assigned mode, if any, rides along as the
  // `play` param exactly like a learner-chosen one would.
  const goToQuiz = (itemId: string, nodeId: string, assignedPlayMode: IQuizItemSummary['assignedPlayMode']) => {
    onClose();
    router.push({
      pathname: '/quiz/[itemId]',
      params: { itemId, nodeId, subjectSlug, courseSlug, play: encodeAssignedPlayMode(assignedPlayMode) },
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

          <Pressable
            onPress={() => {
              onClose();
              router.push({ pathname: '/(app)/quiz-history', params: { contextId: courseId } });
            }}
            style={styles.historyLink}
            hitSlop={8}
          >
            <History size={14} color={colors.primary.DEFAULT} />
            <Text style={styles.historyLinkText}>Quiz History</Text>
          </Pressable>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {tab === 'course' ? (
              groups.length === 0 ? (
                <Text style={styles.emptyText}>No quizzes available for this course yet.</Text>
              ) : (
                // A running counter, not reset per group, so color cycles down the whole flat
                // list (ideal_design_example1.webp's first phone) rather than repeating within
                // a topic that happens to have several quizzes back to back.
                (() => {
                  let colorIndex = 0;
                  return groups.map((group) => (
                    <View key={group.nodeId} style={styles.group}>
                      <Text style={styles.groupHeading} numberOfLines={1}>
                        {group.title}
                      </Text>
                      {group.quizzes.map((item) => {
                        const accent = getAccent(colors, colorIndex++);
                        return (
                          <PaddedButton
                            key={item.itemId}
                            color={accent.light}
                            borderRadius={radii.md}
                            padding={0}
                            borderWidth={0}
                            onPress={() => goToQuiz(item.itemId, group.nodeId, item.quiz.assignedPlayMode)}
                            contentStyle={styles.row}
                          >
                            <View style={[styles.rowIcon, { backgroundColor: accent.DEFAULT }]}>
                              <ClipboardCheck size={18} color="#fff" />
                            </View>
                            {/* Always the theme's primary text tone (near-black in light mode,
                                near-white in dark mode) — never the per-accent `accent.dark` —
                                so a row's text stays legible no matter which accent it landed
                                on (some accents' `.light` fill is itself a deep 900-level color
                                in dark mode, not a pale pastel). */}
                            <View style={styles.rowTextWrap}>
                              <Text style={[styles.rowTitle, { color: colors.text.primary }]} numberOfLines={1}>
                                {item.quiz.title}
                              </Text>
                              <Text style={[styles.rowSubtitle, { color: colors.text.primary }]}>
                                {item.quiz.questionCount} questions
                              </Text>
                            </View>
                            {!item.isUnlocked && <Lock size={16} color={colors.text.primary} />}
                          </PaddedButton>
                        );
                      })}
                    </View>
                  ));
                })()
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
      paddingHorizontal: spacing.md,
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
      paddingHorizontal: spacing.xs,
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
    historyLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    historyLinkText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
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
      fontFamily: fonts.display.medium,
      fontSize: typography.small,
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Passed as PaddedButton's contentStyle — the colored fill (cycled per-item, see the accent
    // lookup at the call site) now lives on the PaddedButton itself (padding: 0, no border, per
    // the "topic quizzes modal" spec), this is just the row's internal layout.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTextWrap: {
      flex: 1,
    },
    rowTitle: {
      fontFamily: fonts.display.medium,
      fontSize: typography.body,
    },
    rowSubtitle: {
      fontFamily: fonts.display.regular,
      fontSize: typography.small,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: typography.small,
      color: colors.text.muted,
      paddingVertical: spacing.lg,
    },
  });
}
