// Ports apps/web's TrueFalsePattern.tsx — shared UI for true_false_term_def,
// true_false_def_term, true_false_usage. content.prompt already carries the full composed
// question text (and quoted sentence, where relevant) — read aloud via SpokenText (live TTS,
// see docs/technical/mobile-architecture.md's "Live TTS (Prompt 3)" section) unless it starts
// with the "audio:" prefix.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Volume2, X } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { playAudioUrl } from '../../../lib/audio';
import { resolveAssetUrl } from '../../../lib/assetUrl';
import { SpokenText } from '../SpokenText';

interface TrueFalsePatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export function TrueFalsePattern({ content, lang, disabled, isSubmitting, onAnswer }: TrueFalsePatternProps) {
  const [selected, setSelected] = useState<'True' | 'False' | null>(null);

  const submit = () => {
    if (!selected || disabled) return;
    onAnswer(selected, selected === 'True' ? 0 : 1);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.promptRow}>
        {content.prompt?.startsWith('audio:') ? (
          <Text style={styles.prompt}>{content.prompt}</Text>
        ) : (
          <SpokenText text={content.prompt ?? ''} lang={lang} containerStyle={styles.spokenPrompt} />
        )}
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

      <View style={styles.optionsRow}>
        <Pressable
          disabled={disabled}
          onPress={() => setSelected('True')}
          style={[styles.optionButton, selected === 'True' && styles.optionTrueSelected]}
        >
          <Check size={20} color={selected === 'True' ? '#fff' : colors.text.primary} />
          <Text style={[styles.optionButtonText, selected === 'True' && styles.optionButtonTextSelected]}>
            True
          </Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => setSelected('False')}
          style={[styles.optionButton, selected === 'False' && styles.optionFalseSelected]}
        >
          <X size={20} color={selected === 'False' ? '#fff' : colors.text.primary} />
          <Text style={[styles.optionButtonText, selected === 'False' && styles.optionButtonTextSelected]}>
            False
          </Text>
        </Pressable>
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
  spokenPrompt: {
    flex: 1,
  },
  audioButton: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.glassSoft,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.glassSoft,
  },
  optionTrueSelected: {
    backgroundColor: colors.success.DEFAULT,
    borderColor: colors.success.DEFAULT,
  },
  optionFalseSelected: {
    backgroundColor: colors.error.DEFAULT,
    borderColor: colors.error.DEFAULT,
  },
  optionButtonText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  optionButtonTextSelected: {
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
