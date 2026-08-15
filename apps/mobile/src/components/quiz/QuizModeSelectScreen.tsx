// Quiz Mode Select screen — full-screen grid of QuizModeCards (Classic/Hearts/Time Run/Streak/
// Perfect/Endless/Survival/Mastery), inserted ahead of QuizSessionScreen for mode:'dynamic'/
// 'pool' quiz entry points (Dictionary "Take Quiz" and a course's Game Quizzes). The
// grid/settings-modal wiring itself lives in QuizModeGrid, shared with QuizPickerModal's "Game
// Quizzes" tab — this component is just that grid plus the screen chrome (Menubar, heading,
// ScreenBackground) and the "where does starting a mode actually go" logic. See CLAUDE.md's
// "Quiz Modes" entry and docs/technical/mobile-architecture.md for the full writeup.
//
// miniApp-only: a Topic (roadmap item) quiz never reaches this screen — a teacher assigns at
// most one specific mode from Content Studio (Quiz.assignedPlayMode), and RoadmapPath/
// QuizPickerModal/the Course screen route straight to /quiz/[itemId] with that assignment (or
// none) already encoded, no selection step. This screen used to also handle a 'roadmapItem'
// target (opted in per-quiz via the now-removed Quiz.allowPlayModes) — see git history /
// mobile-architecture.md if that context is ever needed again.
//
// The chosen mode + settings ride along as a JSON-encoded `play` param (encodePlayModeParam) —
// the same QuizSessionScreen destination the mode-less flow always used, just now carrying real
// Quiz Modes gameplay mechanics (hearts/timer/streak/mistake-limit/perfect-run/mastery — see
// QuizSessionScreen's module comment).
//
// Settings-pill gating: always `true` here — every quiz reachable via this screen is seeded
// isUserAdjustable:true (Dictionary's "General Dictionary Quiz" and every course's
// auto-created mode:'pool' practice quiz).
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import { spacing, typography } from '@my-backpack/shared';
import { ScreenBackground } from '../ScreenBackground';
import { Menubar } from '../Menubar';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { QuizModeGrid } from './QuizModeGrid';
import { encodePlayModeParam, type QuizPlayModeId, type QuizPlayModeSettings } from './quizPlayModes';

interface QuizModeSelectScreenProps {
  target: { miniAppId: string; title?: string };
  backLabel: string;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function QuizModeSelectScreen({ target, backLabel }: QuizModeSelectScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const startSession = (modeId: QuizPlayModeId, settings: QuizPlayModeSettings) => {
    const play = encodePlayModeParam(modeId, settings);
    router.replace({
      pathname: '/quiz/dictionary/[miniAppId]',
      params: { miniAppId: target.miniAppId, name: target.title, play },
    });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.gridScroll} stickyHeaderIndices={[0]}>
        <View style={styles.topSection}>
          <Menubar label={backLabel} onBackPress={() => router.back()} />
          <Text style={styles.heading}>Quiz Modes</Text>
          <Text style={styles.subheading}>Pick how you want to play.</Text>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/quiz-history', params: { contextId: target.miniAppId } })
            }
            style={styles.historyLink}
            hitSlop={8}
          >
            <History size={14} color={colors.primary.DEFAULT} />
            <Text style={styles.historyLinkText}>Quiz History</Text>
          </Pressable>
        </View>

        <QuizModeGrid settingsAdjustable onStart={startSession} />
      </ScrollView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    topSection: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.xs,
    },
    heading: {
      fontFamily: fonts.display.bold, // replaces the old Chewy display heading — see fonts.ts
      fontSize: typography.headingLg,
      color: colors.text.primary,
      marginTop: spacing.sm,
    },
    subheading: {
      fontFamily: fonts.display.regular,
      fontSize: typography.small,
      color: colors.text.muted,
      marginBottom: spacing.xs,
    },
    historyLink: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginBottom: spacing.xs,
    },
    historyLinkText: {
      fontFamily: fonts.display.medium,
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    gridScroll: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
  });
}
