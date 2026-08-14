// Quiz Mode Select screen — full-screen grid of QuizModeCards (Classic/Hearts/Time Run/Streak/
// Perfect/Endless/Survival), inserted ahead of QuizSessionScreen for both quiz entry points
// (Dictionary "Take Quiz" and a roadmap quiz item). The grid/settings-modal wiring itself lives
// in QuizModeGrid, shared with QuizPickerModal's "Game Quizzes" tab — this component is just
// that grid plus the screen chrome (Menubar, heading, ScreenBackground) and the
// target-specific "where does starting a mode actually go" logic. See CLAUDE.md's "Quiz Modes
// (mobile)" entry and docs/technical/mobile-architecture.md for the full writeup.
//
// The chosen mode + settings ride along as a JSON-encoded `play` param (encodePlayModeParam) —
// the *same* QuizSessionScreen destination the two existing routes always used, just now
// carrying real Quiz Modes gameplay mechanics (hearts/timer/streak/mistake-limit/perfect-run —
// see QuizSessionScreen's module comment). Sourcing is unchanged: a roadmapItem session still
// plays its curated quiz's own questions, a miniApp session still plays that quiz's own
// pool/bucket — mode mechanics are a layer on top, not a different question source.
//
// Settings-pill gating: `target.source === 'miniApp'` stands in for Quiz.isUserAdjustable
// (true for the seeded "General Dictionary Quiz" *and* every course's auto-created mode:'pool'
// practice quiz — both are seeded isUserAdjustable:true) without a new API call — every
// roadmapItem-sourced quiz is seeded isUserAdjustable:false. Revisit with a real per-quiz flag
// if that ever stops holding (e.g. a future adjustable roadmap quiz).
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing, typography } from '@my-backpack/shared';
import { ScreenBackground } from '../ScreenBackground';
import { Menubar } from '../Menubar';
import { useTheme } from '../../theme/ThemeContext';
import { QuizModeGrid } from './QuizModeGrid';
import { encodePlayModeParam, type QuizPlayModeId, type QuizPlayModeSettings } from './quizPlayModes';
import type { QuizSessionSource } from './QuizSessionScreen';

interface QuizModeSelectScreenProps {
  target: QuizSessionSource;
  backLabel: string;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function QuizModeSelectScreen({ target, backLabel }: QuizModeSelectScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const settingsAdjustable = target.source === 'miniApp';

  // Same destination either existing route always used — see module comment above.
  const startSession = (modeId: QuizPlayModeId, settings: QuizPlayModeSettings) => {
    const play = encodePlayModeParam(modeId, settings);
    if (target.source === 'roadmapItem') {
      router.replace({
        pathname: '/quiz/[itemId]',
        params: {
          itemId: target.itemId,
          nodeId: target.nodeId,
          subjectSlug: target.subjectSlug,
          courseSlug: target.courseSlug,
          play,
        },
      });
    } else {
      router.replace({
        pathname: '/quiz/dictionary/[miniAppId]',
        params: { miniAppId: target.miniAppId, name: target.title, play },
      });
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.topSection}>
        <Menubar label={backLabel} onBackPress={() => router.back()} />
        <Text style={styles.heading}>Quiz Modes</Text>
        <Text style={styles.subheading}>Pick how you want to play.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.gridScroll}>
        <QuizModeGrid settingsAdjustable={settingsAdjustable} onStart={startSession} />
      </ScrollView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    topSection: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      gap: spacing.xs,
    },
    heading: {
      fontFamily: 'Chewy_400Regular',
      fontSize: typography.headingLg,
      color: colors.text.primary,
      marginTop: spacing.sm,
    },
    subheading: {
      fontFamily: 'Fredoka_400Regular',
      fontSize: typography.small,
      color: colors.text.muted,
      marginBottom: spacing.xs,
    },
    gridScroll: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
  });
}
