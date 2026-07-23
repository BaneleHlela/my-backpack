// Shown as a modal immediately after each answer. Ports apps/web's AnswerFeedback.tsx — no
// backdrop-tap-to-dismiss (onRequestClose is a no-op), advancing via the button is the only
// way out, so the learner can't skip past the result. No SpokenText/TTS wiring — that's
// prompt 3; feedback.text/explanation render as plain Text.
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, SkipForward, Volume2, XCircle } from 'lucide-react-native';
import { ASSETS, colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IQuestionContent } from '@my-backpack/shared';
import { playAudioUrl } from '../../lib/audio';
import { resolveAssetUrl } from '../../lib/assetUrl';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  content: IQuestionContent;
  ageGroup: AgeGroup;
  isLastQuestion: boolean;
  wasSkipped?: boolean;
  onAdvance: () => void;
}

export function AnswerFeedback({
  isCorrect,
  pointsAwarded,
  maxPoints,
  content,
  ageGroup,
  isLastQuestion,
  wasSkipped,
  onAdvance,
}: AnswerFeedbackProps) {
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
  const headlineColor = wasSkipped ? colors.text.secondary : isCorrect ? colors.success.dark : colors.error.dark;

  const feedback = isCorrect ? content.successFeedback : content.tryAgainFeedback;
  const avatarUrl =
    !wasSkipped && content.avatar
      ? ASSETS.AVATARS.image(content.avatar.avatarId, feedback?.avatarEmotion ?? content.avatar.emotion)
      : undefined;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor: ringColor }]}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, isChild && styles.avatarChild]}
              resizeMode="contain"
            />
          ) : null}

          <View style={styles.headerRow}>
            {wasSkipped ? (
              <SkipForward size={28} color={colors.text.muted} />
            ) : isCorrect ? (
              <CheckCircle2 size={28} color={colors.success.DEFAULT} />
            ) : (
              <XCircle size={28} color={colors.error.DEFAULT} />
            )}
            <View style={styles.headerText}>
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
                      <Volume2 size={14} color={colors.text.secondary} />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.feedbackText}>{feedback.text}</Text>
                )
              ) : null}

              {!isCorrect && content.correctAnswer ? (
                <Text style={styles.correctAnswerText}>
                  Correct answer: <Text style={styles.correctAnswerValue}>{content.correctAnswer}</Text>
                </Text>
              ) : null}

              {!wasSkipped && content.explanation ? (
                <Text style={styles.explanationText}>{content.explanation}</Text>
              ) : null}
            </View>
          </View>

          <Pressable onPress={onAdvance} style={[styles.advanceButton, isChild && styles.advanceButtonChild]}>
            <Text style={styles.advanceButtonText}>{isLastQuestion ? 'Finish' : 'Next question'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.lg,
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
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headline: {
    fontSize: typography.heading,
    fontWeight: '700',
  },
  headlineChild: {
    fontSize: typography.headingLg,
  },
  pointsText: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  feedbackTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  feedbackText: {
    fontSize: typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    flexShrink: 1,
  },
  audioButton: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.glassSoft,
  },
  correctAnswerText: {
    fontSize: typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  correctAnswerValue: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  explanationText: {
    fontSize: typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  advanceButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
  },
  advanceButtonChild: {
    paddingVertical: spacing.md + 4,
  },
  advanceButtonText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});
