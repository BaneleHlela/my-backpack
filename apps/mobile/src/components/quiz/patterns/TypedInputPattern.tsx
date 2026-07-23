// Ports apps/web's TypedInputPattern.tsx — shared UI for fill_blank_typed, text_input_def,
// text_input_audio, text_input_example: a text input + submit button.
//
// text_input_audio: the generator doesn't tag content.prompt with the "audio:" prefix
// convention for this type (it only stores instructional text), so there's no GCS path on the
// question itself. Audio is resolved by fetching the term's audioUrl via the existing
// GET /api/vocab/terms/:termId endpoint — no new backend route needed. If a future prompt DOES
// use the "audio:" prefix, that takes priority.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers, QuestionType } from '@my-backpack/shared';
import api from '../../../lib/api';
import { playAudioUrl } from '../../../lib/audio';
import { resolveAssetUrl } from '../../../lib/assetUrl';

interface TypedInputPatternProps {
  type: QuestionType;
  termId?: string;
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export function TypedInputPattern({ type, termId, content, disabled, isSubmitting, onAnswer }: TypedInputPatternProps) {
  const [value, setValue] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const promptIsAudio = content.prompt?.startsWith('audio:') ?? false;

  useEffect(() => {
    setValue('');
    setAudioUrl(promptIsAudio ? resolveAssetUrl(content.prompt!.slice('audio:'.length)) ?? null : null);

    if (!promptIsAudio && type === 'text_input_audio' && termId) {
      setAudioLoading(true);
      api
        .get(`/vocab/terms/${termId}`)
        .then((res) => setAudioUrl(res.data.data.term.audioUrl ?? null))
        .catch(() => setAudioUrl(null))
        .finally(() => setAudioLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, type, content.prompt]);

  const submit = () => {
    if (disabled || !value.trim()) return;
    onAnswer(value.trim());
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

      {type === 'text_input_audio' ? (
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

      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        editable={!disabled}
        placeholder="Type your answer..."
        placeholderTextColor={colors.text.faint}
        autoCapitalize="none"
        style={styles.input}
      />

      <Pressable
        disabled={disabled || !value.trim()}
        onPress={submit}
        style={[styles.submitButton, (disabled || !value.trim()) && styles.submitButtonDisabled]}
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
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.glassSoft,
    fontSize: typography.body,
    color: colors.text.primary,
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
