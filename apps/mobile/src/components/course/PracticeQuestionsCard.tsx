// Book-to-course pipeline, Phase 7 — the "Quiz me on this chapter" suggested action's inline
// practice widget in the AI Helper chat. Deliberately not wired into QuizSession/AnswerRecord —
// no progress tracking, just a lightweight step-through of the questions
// POST /ai-chat/course/:courseId/practice-questions returned. Handles both MCQ/true-false
// (tappable content.options) and typed-answer questions (content has no options) since the
// shared generator can produce either. Ported from apps/web's PracticeQuestionsCard.tsx — same
// behavior, RN primitives.
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../AppText';
import type { IQuestion } from '@my-backpack/shared';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface PracticeQuestionsCardProps {
  questions: IQuestion[];
  onDismiss: () => void;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function PracticeQuestionsCard({ questions, onDismiss }: PracticeQuestionsCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submittedTyped, setSubmittedTyped] = useState(false);

  const question = questions[index];

  if (!question) {
    return (
      <GlassCard intensity="soft" style={styles.card}>
        <Text style={styles.title}>
          Nice work! That was all {questions.length} practice question
          {questions.length === 1 ? '' : 's'}.
        </Text>
        <Pressable onPress={onDismiss} style={styles.actionRow}>
          <Text style={styles.actionText}>Dismiss</Text>
        </Pressable>
      </GlassCard>
    );
  }

  const content = question.content;
  const hasOptions = Array.isArray(content.options) && content.options.length > 0;
  const answered = hasOptions ? selected !== null : submittedTyped;
  const isCorrect = hasOptions
    ? selected === content.correctAnswer
    : normalize(typedAnswer) === normalize(content.correctAnswer ?? '');

  const handleNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setTypedAnswer('');
    setSubmittedTyped(false);
  };

  return (
    <GlassCard intensity="soft" style={styles.card}>
      <Text style={styles.meta}>
        Practice question {index + 1} of {questions.length}
      </Text>
      <Text style={styles.title}>{content.prompt}</Text>

      {hasOptions ? (
        <View style={styles.optionsList}>
          {(content.options ?? []).map((option) => {
            const isSelected = selected === option;
            const isThisCorrect = option === content.correctAnswer;
            const optionStyle = [
              styles.option,
              answered && isThisCorrect && styles.optionCorrect,
              answered && !isThisCorrect && isSelected && styles.optionWrong,
            ];
            return (
              <Pressable
                key={option}
                onPress={() => !answered && setSelected(option)}
                disabled={answered}
                style={optionStyle}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.typedRow}>
          <TextInput
            value={typedAnswer}
            onChangeText={setTypedAnswer}
            editable={!submittedTyped}
            placeholder="Type your answer…"
            placeholderTextColor={colors.text.faint}
            style={styles.input}
          />
          {!submittedTyped && (
            <Pressable
              onPress={() => typedAnswer.trim() && setSubmittedTyped(true)}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          )}
        </View>
      )}

      {answered && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            {isCorrect ? '✅ Correct!' : `❌ Not quite — the answer is "${content.correctAnswer}".`}
          </Text>
          {content.explanation && <Text style={styles.feedbackBody}>{content.explanation}</Text>}
        </View>
      )}

      {answered && (
        <Pressable onPress={handleNext} style={styles.actionRow}>
          <Text style={styles.actionText}>
            {index + 1 < questions.length ? 'Next question →' : 'Finish'}
          </Text>
        </Pressable>
      )}
    </GlassCard>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm,
      maxWidth: '90%',
      alignSelf: 'flex-start',
    },
    meta: {
      fontSize: typography.small,
      color: colors.text.muted,
    },
    title: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
    },
    optionsList: {
      gap: spacing.xs,
    },
    option: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.surface.border,
      backgroundColor: colors.surface.glass,
    },
    optionCorrect: {
      backgroundColor: colors.success.light,
      borderColor: colors.success.DEFAULT,
    },
    optionWrong: {
      backgroundColor: colors.error.light,
      borderColor: colors.error.DEFAULT,
    },
    optionText: {
      fontSize: typography.body,
      color: colors.text.primary,
    },
    typedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface.glass,
      borderWidth: 1,
      borderColor: colors.surface.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      fontSize: typography.body,
      color: colors.text.primary,
    },
    submitButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
      backgroundColor: colors.primary.DEFAULT,
    },
    submitButtonText: {
      fontSize: typography.small,
      fontWeight: '700',
      color: '#fff',
    },
    feedback: {
      backgroundColor: colors.surface.glassSoft,
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    feedbackTitle: {
      fontSize: typography.small,
      fontWeight: '700',
      color: colors.text.primary,
    },
    feedbackBody: {
      fontSize: typography.small,
      color: colors.text.muted,
      marginTop: spacing.xs / 2,
    },
    actionRow: {
      alignSelf: 'flex-end',
    },
    actionText: {
      fontSize: typography.small,
      fontWeight: '700',
      color: colors.primary.DEFAULT,
    },
  });
}
