// Listening questions carry their recording; legacy questions can speak the answer word
// without a second authenticated term-detail request. The answer is never rendered as a label.
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { Ref } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../AppText';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers, QuestionType } from '@my-backpack/shared';
import { AudioButton } from '../../AudioButton';
import { listeningAudioSource } from '../../../lib/questionAudio';
import { SpokenText } from '../SpokenText';
import { useTheme } from '../../../theme/ThemeContext';
import { fonts } from '../../../theme/fonts';
import type { QuestionPatternHandle, QuestionPatternReadyProps } from './questionPatternTypes';

interface TypedInputPatternProps extends QuestionPatternReadyProps {
  type: QuestionType;
  termId?: string;
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export const TypedInputPattern = forwardRef(function TypedInputPattern(
  { type, termId, content, lang, disabled, onAnswer, onReadyChange }: TypedInputPatternProps,
  ref: Ref<QuestionPatternHandle>
) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [value, setValue] = useState('');

  const promptIsAudio = content.prompt?.startsWith('audio:') ?? false;

  const source = listeningAudioSource(content, lang, type === 'text_input_audio');
  useEffect(() => { setValue(''); }, [termId, type, content]);

  const submit = () => {
    if (disabled || !value.trim()) return;
    onAnswer(value.trim());
  };

  useImperativeHandle(ref, () => ({ submit }));

  useEffect(() => {
    onReadyChange?.(value.trim().length > 0 && !disabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.promptRow}>
        {promptIsAudio || type === 'text_input_audio' ? (
          <Text style={styles.prompt}>
            {promptIsAudio ? 'Listen, then type what you hear.' : content.prompt}
          </Text>
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

      {promptIsAudio || type === 'text_input_audio' ? (
        <View style={styles.audioRow}>
          <AudioButton {...source} label="Play word" />
          {!source.url && !source.text ? (
            <Text style={styles.noAudioText}>No audio is available for this question.</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.answerField}>
        <Text style={styles.instruction}>Your answer</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={submit}
          editable={!disabled}
          placeholder="Type your answer..."
          placeholderTextColor={colors.text.faint}
          accessibilityLabel="Your answer"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={styles.input}
        />
      </View>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.lg,
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
    audioRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
    },
    noAudioText: {
      fontSize: typography.small,
      color: colors.text.muted,
    },
    input: {
      minHeight: 56,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: colors.primary.light,
      backgroundColor: colors.background,
      fontFamily: fonts.body.regular,
      fontSize: typography.body,
      color: colors.text.primary,
    },
    answerField: { gap: spacing.sm },
    instruction: { fontSize: typography.small, color: colors.text.secondary },
  });
}
