// Ports apps/web's TrueFalsePattern.tsx — shared UI for true_false_term_def,
// true_false_def_term, true_false_usage. content.prompt already carries the full composed
// question text (and quoted sentence, where relevant) — read aloud via SpokenText (live TTS,
// see docs/technical/mobile-architecture.md's "Live TTS (Prompt 3)" section) unless it starts
// with the "audio:" prefix. Submitting happens via the global Submit button (owned by
// QuizSessionScreen, see questionPatternTypes.ts), not a button local to this pattern.
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../AppText';
import { Check, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { AudioButton } from '../../AudioButton';
import { resolveAssetUrl } from '../../../lib/assetUrl';
import { SpokenText } from '../SpokenText';
import { useTheme } from '../../../theme/ThemeContext';
import type { QuestionPatternHandle, QuestionPatternReadyProps } from './questionPatternTypes';

interface TrueFalsePatternProps extends QuestionPatternReadyProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export const TrueFalsePattern = forwardRef(function TrueFalsePattern(
  { content, lang, disabled, onAnswer, onReadyChange }: TrueFalsePatternProps,
  ref: Ref<QuestionPatternHandle>
) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [selected, setSelected] = useState<'True' | 'False' | null>(null);
  const audioPromptUrl = content.prompt?.startsWith('audio:')
    ? resolveAssetUrl(content.prompt.slice('audio:'.length))
    : undefined;

  const submit = () => {
    if (!selected || disabled) return;
    onAnswer(selected, selected === 'True' ? 0 : 1);
  };

  useImperativeHandle(ref, () => ({ submit }));

  // Reset per-question state whenever a new question loads — previously the prior selection
  // carried over when the next question was also a true/false type.
  useEffect(() => {
    setSelected(null);
  }, [content]);

  useEffect(() => {
    onReadyChange?.(selected !== null && !disabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, disabled]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.promptRow}>
        {audioPromptUrl ? (
          <AudioButton url={audioPromptUrl} label="Play audio" />
        ) : (
          <SpokenText
            text={content.prompt ?? ''}
            lang={lang}
            audioUrl={content.promptAudioUrl}
            textStyle={styles.prompt}
            containerStyle={styles.spokenPrompt}
          />
        )}
      </View>

      <Text style={styles.instruction}>Is this statement true or false?</Text>
      <View style={styles.optionsRow} accessibilityRole="radiogroup">
        <Pressable
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === 'True', disabled: Boolean(disabled) }}
          onPress={() => setSelected('True')}
          style={[styles.optionButton, selected === 'True' && styles.optionSelected]}
        >
          <Check size={20} color={selected === 'True' ? '#fff' : colors.text.primary} />
          <Text style={[styles.optionButtonText, selected === 'True' && styles.optionButtonTextSelected]}>
            True
          </Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === 'False', disabled: Boolean(disabled) }}
          onPress={() => setSelected('False')}
          style={[styles.optionButton, selected === 'False' && styles.optionSelected]}
        >
          <X size={20} color={selected === 'False' ? '#fff' : colors.text.primary} />
          <Text style={[styles.optionButtonText, selected === 'False' && styles.optionButtonTextSelected]}>
            False
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
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
      fontSize: typography.bodyChild,
      color: colors.text.primary,
      lineHeight: 28,
      fontWeight: '600',
    },
    spokenPrompt: {
      flex: 1,
    },
    instruction: { fontSize: typography.small, color: colors.text.secondary, marginTop: spacing.sm },
    optionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    optionButton: {
      minHeight: 64,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: colors.text.faint,
      backgroundColor: colors.background,
    },
    optionSelected: {
      backgroundColor: colors.primary.dark,
      borderColor: colors.primary.dark,
    },
    optionButtonText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
      flexShrink: 1,
    },
    optionButtonTextSelected: {
      color: '#fff',
    },
  });
}
