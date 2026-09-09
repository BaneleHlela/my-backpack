import { Linking, Pressable, TextInput, View } from 'react-native';
import type { VocabularyBucket } from '@my-backpack/shared';
import { Text } from '../AppText';
import { BucketAction, BucketSheet, useBucketStyles } from './BucketControls';
import { useBucketWordImport } from '../../features/buckets/useBucketWordImport';
import { useTheme } from '../../theme/ThemeContext';

export function BucketWordsSheet({
  bucket,
  onClose,
  onSaved,
}: {
  bucket: VocabularyBucket;
  onClose: () => void;
  onSaved: () => void;
}) {
  const s = useBucketStyles();
  const { colors } = useTheme();
  const f = useBucketWordImport(bucket._id, bucket.miniAppId, () => {
    onSaved();
    onClose();
  });
  return (
    <BucketSheet
      title={'Add words to ' + bucket.name}
      busy={f.busy}
      onClose={onClose}
      footer={
        <BucketAction
          tone="lime"
          disabled={f.busy || !f.selected.length || f.selected.length > 20}
          onPress={() => void f.save()}
        >
          Add {f.selected.length} selected meanings
        </BucketAction>
      }
    >
      <Text style={s.heading}>Get word ideas</Text>
      <Text style={s.muted}>
        Ask AI for 10 words. You choose the dictionary meanings below.
      </Text>
      <TextInput
        style={s.input}
        placeholder="Topic, e.g. space exploration"
        placeholderTextColor={colors.text.muted}
        accessibilityLabel="Suggestion topic"
        value={f.topic}
        onChangeText={f.setTopic}
        maxLength={160}
        editable={!f.busy}
      />
      <BucketAction disabled={f.busy} onPress={() => void f.recommend()}>
        Suggest 10 words
      </BucketAction>
      <Text style={s.heading}>Or paste a word list</Text>
      <TextInput
        style={[s.input, { minHeight: 110, textAlignVertical: 'top' }]}
        placeholder="Up to 20 words, separated by commas or new lines"
        placeholderTextColor={colors.text.muted}
        accessibilityLabel="Word list"
        multiline
        value={f.text}
        onChangeText={f.setText}
        maxLength={1400}
        editable={!f.busy}
      />
      <BucketAction
        tone="neutral"
        disabled={f.busy || !f.text.trim()}
        onPress={() => void f.previewList()}
      >
        Review dictionary meanings
      </BucketAction>
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          void Linking.openURL(
            'https://www.merriam-webster.com/vocabulary/see-all'
          )
        }
      >
        <Text style={s.text}>
          Browse Merriam-Webster vocabulary collections ↗
        </Text>
      </Pressable>
      <Text style={s.muted}>
        Bring the words you want to learn from a collection, then review their
        meanings here.
      </Text>
      {!!f.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {f.error}
        </Text>
      )}
      {f.previews.map((p) => (
        <View key={p.word} style={s.card}>
          <Text style={s.heading}>{p.word}</Text>
          {!!p.hint && <Text style={s.muted}>Suggested sense: {p.hint}</Text>}
          {p.status === 'ready' && p.definitions.length === 0 && (
            <Text style={s.muted}>
              No dictionary meanings available. Try a different spelling.
            </Text>
          )}
          {p.definitions.map((d) => (
            <Pressable
              key={d._id}
              disabled={f.busy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: f.selected.includes(d._id) }}
              onPress={() => f.toggle(d._id)}
              style={s.divider}
            >
              <Text style={s.text}>
                {f.selected.includes(d._id) ? '☑' : '☐'} {d.partOfSpeech} ·{' '}
                {d.definition}
              </Text>
            </Pressable>
          ))}
          {p.status !== 'ready' && (
            <>
              <Text style={s.muted}>
                {p.status === 'not_found'
                  ? 'No matching dictionary entry. Try another spelling.'
                  : 'Look this word up to choose a meaning.'}
              </Text>
              <BucketAction
                disabled={f.busy}
                tone="neutral"
                onPress={() => void f.lookup(p.word)}
              >
                Look up {p.word}
              </BucketAction>
            </>
          )}
        </View>
      ))}
    </BucketSheet>
  );
}
