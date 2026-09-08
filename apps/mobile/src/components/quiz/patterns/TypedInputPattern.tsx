// Ports apps/web's TypedInputPattern.tsx — shared UI for fill_blank_typed, text_input_def,
// text_input_audio, text_input_example: a text input, submitted via the global Submit button
// (owned by QuizSessionScreen, see questionPatternTypes.ts) or the keyboard's "done"/submit key.
// content.prompt is read aloud via SpokenText (live TTS, see
// docs/technical/mobile-architecture.md's "Live TTS (Prompt 3)" section) unless it's the
// "audio:" prefix case or text_input_audio (both already have their own dedicated audio
// playback flow below).
//
// text_input_audio: the generator doesn't tag content.prompt with the "audio:" prefix
// convention for this type (it only stores instructional text), so there's no GCS path on the
// question itself. Audio is resolved by fetching the term's audioUrl via the existing
// GET /api/vocab/terms/:termId endpoint — no new backend route needed. If a future prompt DOES
// use the "audio:" prefix, that takes priority.
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { Ref } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../AppText';
import { Volume2 } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers, QuestionType } from '@my-backpack/shared';
import api from '../../../lib/api';
import { playAudioUrl } from '../../../lib/audio';
import { resolveAssetUrl } from '../../../lib/assetUrl';
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const promptIsAudio = content.prompt?.startsWith('audio:') ?? false;

  useEffect(() => {
    let cancelled = false;
    setValue('');
    setAudioUrl(promptIsAudio ? (resolveAssetUrl(content.prompt!.slice('audio:'.length)) ?? null) : null);
    setAudioLoading(false);

    if (!promptIsAudio && type === 'text_input_audio' && termId) {
      setAudioLoading(true);
      api
        .get(`/vocab/terms/${termId}`)
        .then((res) => {
          if (!cancelled) setAudioUrl(res.data.data.term.audioUrl ?? null);
        })
        .catch(() => {
          if (!cancelled) setAudioUrl(null);
        })
        .finally(() => {
          if (!cancelled) setAudioLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, type, content.prompt]);

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
            textStyle={styles.prompt}
            containerStyle={styles.spokenPrompt}
          />
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

      {promptIsAudio || type === 'text_input_audio' ? (
        <View style={styles.audioRow}>
          <Pressable
            onPress={() => audioUrl && playAudioUrl(audioUrl)}
            disabled={!audioUrl || audioLoading}
            style={[styles.playAudioButton, (!audioUrl || audioLoading) && styles.playAudioButtonDisabled]}
          >
            {audioLoading ? <ActivityIndicator color="#fff" /> : <Volume2 size={16} color="#fff" />}
            <Text style={styles.playAudioButtonText}>Play audio</Text>
          </Pressable>
          {!audioLoading && !audioUrl ? (
            <Text style={styles.noAudioText}>No audio available for this word.</Text>
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
    audioButton: {
      width: 44,
      height: 44,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.text.faint,
    },
    audioRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
    },
    playAudioButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.primary.dark,
    },
    playAudioButtonDisabled: {
      opacity: 0.5,
    },
    playAudioButtonText: {
      fontSize: typography.small,
      fontWeight: '700',
      color: '#fff',
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
