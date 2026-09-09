// Shown as a modal immediately after each answer. Ports apps/web's AnswerFeedback.tsx — no
// backdrop-tap-to-dismiss (onRequestClose is a no-op), advancing via the button is the only
// way out, so the learner can't skip past the result. content.explanation and feedback.text
// are read aloud via SpokenText (live TTS, see docs/technical/mobile-architecture.md's "Live
// TTS (Prompt 3)" section) — explanation always (no prerecorded equivalent exists), feedback
// text only when feedback.audioUrl isn't set (that prerecorded clip wins instead).
//
// Feedback scrolls within the available safe-area height; the next/finish action stays visible.
import { Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../AppText';
import { CheckCircle2, SkipForward, Volume2, XCircle } from 'lucide-react-native';
import { ASSETS, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IQuestionContent } from '@my-backpack/shared';
import { playAudioUrl } from '../../lib/audio';
import { resolveAssetUrl } from '../../lib/assetUrl';
import { fonts } from '../../theme/fonts';
import { SpokenText } from './SpokenText';
import { QuizActionButton } from './QuizActionButton';
import { useTheme } from '../../theme/ThemeContext';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  content: IQuestionContent;
  ageGroup: AgeGroup;
  lang: string;
  isLastQuestion: boolean;
  wasSkipped?: boolean;
  onAdvance: () => void;
}

const CARD_MAX_WIDTH = 420;
const CARD_PADDING = spacing.lg;

export function AnswerFeedback({
  isCorrect,
  pointsAwarded,
  maxPoints,
  content,
  ageGroup,
  lang,
  isLastQuestion,
  wasSkipped,
  onAdvance,
}: AnswerFeedbackProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isChild = ageGroup === 'child';

  const headline = wasSkipped
    ? 'Skipped'
    : isCorrect
      ? isChild
        ? 'Well done! 🎉'
        : 'Correct'
      : isChild
        ? 'Try again next time!'
        : 'Not quite';

  const ringColor = wasSkipped
    ? colors.text.faint
    : isCorrect
      ? colors.success.DEFAULT
      : colors.error.DEFAULT;

  const feedback = isCorrect ? content.successFeedback : content.tryAgainFeedback;
  const avatarUrl =
    !wasSkipped && content.avatar
      ? ASSETS.AVATARS.image(content.avatar.avatarId, feedback?.avatarEmotion ?? content.avatar.emotion)
      : undefined;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              borderColor: ringColor,
              maxHeight: windowHeight - insets.top - insets.bottom - spacing.lg * 2,
            },
          ]}
        >
          <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.avatar, isChild && styles.avatarChild]}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.headerColumn}>
              {wasSkipped ? (
                <SkipForward size={28} color={colors.text.secondary} />
              ) : isCorrect ? (
                <CheckCircle2 size={28} color={colors.success.DEFAULT} />
              ) : (
                <XCircle size={28} color={colors.error.DEFAULT} />
              )}
              <Text accessibilityRole="header" style={[styles.headline, isChild && styles.headlineChild]}>
                {headline}
              </Text>
              <Text style={styles.pointsText}>
                {pointsAwarded} / {maxPoints} points
              </Text>

              {!wasSkipped && feedback?.text ? (
                feedback.audioUrl ? (
                  <View style={styles.feedbackTextRow}>
                    <Text style={styles.feedbackText}>{feedback.text}</Text>
                    <Pressable
                      onPress={() => playAudioUrl(resolveAssetUrl(feedback.audioUrl)!)}
                      hitSlop={8}
                      style={styles.audioButton}
                    >
                      <Volume2 size={18} color={colors.text.secondary} />
                    </Pressable>
                  </View>
                ) : (
                  <SpokenText
                    text={feedback.text}
                    lang={lang}
                    textStyle={styles.feedbackText}
                    containerStyle={styles.spokenRow}
                  />
                )
              ) : null}

              {!isCorrect && content.correctAnswer ? (
                <Text style={styles.correctAnswerText}>
                  Correct answer: <Text style={styles.correctAnswerValue}>{content.correctAnswer}</Text>
                </Text>
              ) : null}

              {!wasSkipped && content.explanation ? (
                <SpokenText
                  text={content.explanation}
                  lang={lang}
                  textStyle={styles.explanationText}
                  containerStyle={styles.spokenRow}
                />
              ) : null}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <QuizActionButton label={isLastQuestion ? 'Finish' : 'Next question'} onPress={onAdvance} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: CARD_MAX_WIDTH,
      flexShrink: 1,
      borderRadius: radii.lg,
      borderWidth: 1,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    cardScroll: { flexShrink: 1 },
    cardContent: {
      padding: CARD_PADDING,
    },
    footer: { padding: CARD_PADDING, paddingTop: spacing.sm },
    avatar: {
      width: 64,
      height: 64,
      alignSelf: 'center',
      marginBottom: spacing.sm,
    },
    avatarChild: {
      width: 80,
      height: 80,
    },
    headerColumn: {
      alignItems: 'center',
      gap: 4,
    },
    headline: {
      fontFamily: fonts.display.bold,
      fontSize: typography.heading,
      textAlign: 'center',
      color: colors.text.primary,
    },
    headlineChild: {
      fontSize: typography.headingLg,
    },
    pointsText: {
      fontSize: typography.small,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    feedbackTextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    feedbackText: {
      flexShrink: 1,
      fontSize: typography.small,
      color: colors.text.secondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    // Widened to the full card so SpokenText's row (text + its own read-aloud button) wraps and
    // centers instead of shrink-wrapping around whatever width its content happens to need.
    spokenRow: {
      width: '100%',
      justifyContent: 'center',
    },
    audioButton: {
      width: 44,
      height: 44,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.text.faint,
    },
    correctAnswerText: {
      fontSize: typography.small,
      color: colors.text.secondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    correctAnswerValue: {
      fontWeight: '700',
      color: colors.text.primary,
    },
    explanationText: {
      fontSize: typography.small,
      color: colors.text.secondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  });
}
