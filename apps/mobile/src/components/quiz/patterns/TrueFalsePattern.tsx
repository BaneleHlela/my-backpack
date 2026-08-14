// Ports apps/web's TrueFalsePattern.tsx — shared UI for true_false_term_def,
// true_false_def_term, true_false_usage. content.prompt already carries the full composed
// question text (and quoted sentence, where relevant) — read aloud via SpokenText (live TTS,
// see docs/technical/mobile-architecture.md's "Live TTS (Prompt 3)" section) unless it starts
// with the "audio:" prefix. Submitting happens via the global Submit button (owned by
// QuizSessionScreen, see questionPatternTypes.ts), not a button local to this pattern.
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Volume2, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers } from '@my-backpack/shared';
import { playAudioUrl } from '../../../lib/audio';
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

  const submit = () => {
    if (!selected || disabled) return;
    onAnswer(selected, selected === 'True' ? 0 : 1);
  };

  useImperativeHandle(ref, () => ({ submit }));

  useEffect(() => {
    onReadyChange?.(selected !== null && !disabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, disabled]);

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
            <Volume2 size={16} color={colors.glassText.secondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.optionsRow}>
        <Pressable
          disabled={disabled}
          onPress={() => setSelected('True')}
          style={[styles.optionButton, selected === 'True' && styles.optionTrueSelected]}
        >
          <Check size={20} color={selected === 'True' ? '#fff' : colors.glassText.primary} />
          <Text style={[styles.optionButtonText, selected === 'True' && styles.optionButtonTextSelected]}>
            True
          </Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => setSelected('False')}
          style={[styles.optionButton, selected === 'False' && styles.optionFalseSelected]}
        >
          <X size={20} color={selected === 'False' ? '#fff' : colors.glassText.primary} />
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
      color: colors.glassText.primary,
    },
    optionButtonTextSelected: {
      color: '#fff',
    },
  });
}
