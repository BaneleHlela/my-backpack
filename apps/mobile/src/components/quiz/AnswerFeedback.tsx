// Shown as a modal immediately after each answer. Ports apps/web's AnswerFeedback.tsx — no
// backdrop-tap-to-dismiss (onRequestClose is a no-op), advancing via the button is the only
// way out, so the learner can't skip past the result. content.explanation and feedback.text
// are read aloud via SpokenText (live TTS, see docs/technical/mobile-architecture.md's "Live
// TTS (Prompt 3)" section) — explanation always (no prerecorded equivalent exists), feedback
// text only when feedback.audioUrl isn't set (that prerecorded clip wins instead).
//
// The card is a DepthView (../DepthView.tsx) and the advance button a DepthButton
// (../DepthButton.tsx) — the same "3D gloss plate" chrome used everywhere else in this restyle
// (see QuizSessionScreen's module comment). The correct/incorrect/skipped ring that used to be
// a plain `borderColor` is now DepthView's `shadowColor` — an opaque tint drawn where the rim
// peeks out from behind the inset face, so it reads as a colored ring around the whole card
// rather than a thin 1-2px border line.
import { Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../AppText';
import { CheckCircle2, SkipForward, Volume2, XCircle } from 'lucide-react-native';
import { ASSETS, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IQuestionContent } from '@my-backpack/shared';
import { playAudioUrl } from '../../lib/audio';
import { resolveAssetUrl } from '../../lib/assetUrl';
import { SpokenText } from './SpokenText';
import { DepthView } from '../DepthView';
import { DepthButton } from '../DepthButton';
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
  const { width: windowWidth } = useWindowDimensions();
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

  const ringColor = wasSkipped ? colors.text.faint : isCorrect ? colors.success.DEFAULT : colors.error.DEFAULT;
  // The card face itself is always solid white (see the DepthView `color` prop below) regardless
  // of app theme, so text drawn on it must stay on the fixed dark-on-light `glassText` scale —
  // never `text.*`, which flips to pale/cream tones in dark mode and would go illegible here.
  const headlineColor = wasSkipped ? colors.glassText.secondary : isCorrect ? colors.success.dark : colors.error.dark;

  const feedback = isCorrect ? content.successFeedback : content.tryAgainFeedback;
  const avatarUrl =
    !wasSkipped && content.avatar
      ? ASSETS.AVATARS.image(content.avatar.avatarId, feedback?.avatarEmotion ?? content.avatar.emotion)
      : undefined;

  const cardWidth = Math.min(CARD_MAX_WIDTH, windowWidth - spacing.lg * 2);
  const advanceButtonWidth = cardWidth - CARD_PADDING * 2;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <DepthView
          width={cardWidth}
          color="#ffffff"
          shadowColor={ringColor}
          borderRadius={radii.lg}
          contentStyle={styles.cardContent}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, isChild && styles.avatarChild]}
              resizeMode="contain"
            />
          ) : null}

          <View style={styles.headerColumn}>
            {wasSkipped ? (
              <SkipForward size={28} color={colors.glassText.muted} />
            ) : isCorrect ? (
              <CheckCircle2 size={28} color={colors.success.DEFAULT} />
            ) : (
              <XCircle size={28} color={colors.error.DEFAULT} />
            )}
            <Text style={[styles.headline, { color: headlineColor }, isChild && styles.headlineChild]}>
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
                    <Volume2 size={14} color={colors.glassText.secondary} />
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

          <DepthButton
            width={advanceButtonWidth}
            height={isChild ? 60 : 52}
            color={colors.primary.DEFAULT}
            borderRadius={radii.md}
            onPress={onAdvance}
            style={styles.advanceButton}
          >
            <Text style={styles.advanceButtonText}>{isLastQuestion ? 'Finish' : 'Next question'}</Text>
          </DepthButton>
        </DepthView>
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
    cardContent: {
      padding: CARD_PADDING,
    },
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
      fontSize: typography.heading,
      fontWeight: '700',
      textAlign: 'center',
    },
    headlineChild: {
      fontSize: typography.headingLg,
    },
    pointsText: {
      fontSize: typography.small,
      color: colors.glassText.secondary,
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
      fontSize: typography.small,
      color: colors.glassText.secondary,
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
      width: 24,
      height: 24,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      // Not `colors.surface.glassSoft` — that's a white-based translucent tint meant to sit over
      // a wallpaper/blur, which would be invisible against this card's own solid white face. A
      // dark-based tint instead, same in both themes.
      backgroundColor: 'rgba(31,41,55,0.06)',
    },
    correctAnswerText: {
      fontSize: typography.small,
      color: colors.glassText.secondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    correctAnswerValue: {
      fontWeight: '700',
      color: colors.glassText.primary,
    },
    explanationText: {
      fontSize: typography.small,
      color: colors.glassText.secondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    advanceButton: {
      alignSelf: 'center',
      marginTop: spacing.lg,
    },
    advanceButtonText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
