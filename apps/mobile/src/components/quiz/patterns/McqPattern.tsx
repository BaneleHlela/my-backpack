// Ports apps/web's McqPattern.tsx — shared UI for mcq_term_to_def, mcq_def_to_term,
// mcq_correct_usage, mcq_incorrect_usage, mcq_fill_blank. content.prompt already carries the
// fully-composed question text from the generator. No SpokenText/TTS wiring here — that's
// prompt 3; prompt renders as plain Text. Selecting an option never submits immediately — the
// learner always confirms with the Submit button.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { playAudioUrl } from '../../../lib/audio';
import { resolveAssetUrl } from '../../../lib/assetUrl';

interface McqPatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function McqPattern({ content, disabled, isSubmitting, onAnswer }: McqPatternProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = content.options ?? [];

  const submit = () => {
    if (selected === null || disabled) return;
    onAnswer(options[selected], selected);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.promptRow}>
        <Text style={styles.prompt}>{content.prompt}</Text>
        {content.promptAudioUrl ? (
          <Pressable
            onPress={() => playAudioUrl(resolveAssetUrl(content.promptAudioUrl)!)}
            hitSlop={8}
            style={styles.audioButton}
          >
            <Volume2 size={16} color={colors.text.secondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.options}>
        {options.map((option, i) => (
          <Pressable
            key={`${i}-${option}`}
            disabled={disabled}
            onPress={() => setSelected(i)}
            style={[styles.option, selected === i && styles.optionSelected]}
          >
            <View style={[styles.optionBadge, selected === i && styles.optionBadgeSelected]}>
              <Text style={[styles.optionBadgeText, selected === i && styles.optionBadgeTextSelected]}>
                {OPTION_LABELS[i] ?? i + 1}
              </Text>
            </View>
            <Text style={[styles.optionText, selected === i && styles.optionTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={selected === null || disabled}
        onPress={submit}
        style={[styles.submitButton, (selected === null || disabled) && styles.submitButtonDisabled]}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
    padding: spacing.md,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  prompt: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text.primary,
  },
  audioButton: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.glassSoft,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.glassSoft,
  },
  optionSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  optionBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  optionBadgeText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  optionBadgeTextSelected: {
    color: '#fff',
  },
  optionText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text.primary,
  },
  optionTextSelected: {
    color: '#fff',
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});
