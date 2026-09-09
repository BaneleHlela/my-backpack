import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '../AppText';
import {
  BucketAction,
  BucketSheet,
  useBucketStyles,
} from '../buckets/BucketControls';
import { QuizBucketChoices } from '../buckets/QuizBucketChoices';
import { useQuizBuckets } from '../../features/buckets/useQuizBuckets';
import { bucketError } from '../../features/buckets/useBucketResource';
import type { QuizPlayModeDef, QuizPlayModeSettings } from './quizPlayModes';

interface QuizSettingsModalProps {
  mode: QuizPlayModeDef;
  settings: QuizPlayModeSettings;
  miniAppId?: string;
  onClose: () => void;
  onConfirm: (settings: QuizPlayModeSettings) => void;
}

export function QuizSettingsModal({
  mode,
  settings,
  miniAppId,
  onClose,
  onConfirm,
}: QuizSettingsModalProps) {
  const s = useBucketStyles();
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choice = useQuizBuckets(
    { miniAppId, playModeId: mode.id },
    settings.bucketIds
  );
  const confirm = async () => {
    if (!choice.ready || busy) return;
    setBusy(true);
    setError('');
    try {
      await choice.save();
      onConfirm({
        ...draft,
        playModeId: mode.id,
        ...(choice.data?.supported ? { bucketIds: choice.bucketIds } : {}),
      });
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BucketSheet
      title={`${mode.label} settings`}
      busy={busy}
      onClose={onClose}
      footer={
        <BucketAction
          disabled={busy || !choice.ready}
          onPress={() => void confirm()}
        >
          Start quiz
        </BucketAction>
      }
    >
      <Text style={s.muted}>{mode.blurb}</Text>
      {mode.settingKey !== 'none' && mode.settingOptions && (
        <View style={{ gap: 12 }}>
          <Text style={s.heading}>{mode.settingLabel}</Text>
          <View style={s.row}>
            {mode.settingOptions.map((o) => (
              <BucketAction
                key={o.value}
                disabled={busy}
                tone={
                  draft[mode.settingKey as keyof QuizPlayModeSettings] ===
                  o.value
                    ? 'violet'
                    : 'neutral'
                }
                onPress={() =>
                  setDraft({ ...draft, [mode.settingKey]: o.value })
                }
              >
                {o.label}
              </BucketAction>
            ))}
          </View>
        </View>
      )}
      <View style={s.between}>
        <Text style={[s.text, { flex: 1 }]}>Show answers at the end</Text>
        <Switch
          disabled={busy}
          value={draft.feedbackMode === 'end'}
          onValueChange={(v) =>
            setDraft({ ...draft, feedbackMode: v ? 'end' : 'immediate' })
          }
        />
      </View>
      <View style={s.between}>
        <Text style={[s.text, { flex: 1 }]}>Shuffle questions</Text>
        <Switch
          disabled={busy}
          value={!!draft.shuffleQuestions}
          onValueChange={(v) => setDraft({ ...draft, shuffleQuestions: v })}
        />
      </View>
      {choice.data?.supported && (
        <View style={{ gap: 12 }}>
          <Text style={s.heading}>Words to practise</Text>
          <View style={s.row}>
            {(['learning', 'mastered', 'all'] as const).map((filter) => (
              <BucketAction
                key={filter}
                tone={
                  (draft.bucketFilter ?? 'learning') === filter
                    ? 'violet'
                    : 'neutral'
                }
                onPress={() => setDraft({ ...draft, bucketFilter: filter })}
              >
                {filter[0].toUpperCase() + filter.slice(1)}
              </BucketAction>
            ))}
          </View>
        </View>
      )}
      {miniAppId && <QuizBucketChoices choice={choice} onClose={onClose} />}
      {!!error && <Text style={s.error}>{error}</Text>}
    </BucketSheet>
  );
}
