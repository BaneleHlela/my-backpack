import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { BUCKET_COLORS, type VocabularyBucket } from '@my-backpack/shared';
import api from '../../lib/api';
import { Text } from '../AppText';
import { BucketAction, useBucketStyles } from './BucketControls';
import { bucketError } from '../../features/buckets/useBucketResource';
import { useTheme } from '../../theme/ThemeContext';

export function CreateBucketForm({
  miniAppId,
  onCreated,
  onCancel,
}: {
  miniAppId: string;
  onCreated: (bucket: VocabularyBucket) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(BUCKET_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const s = useBucketStyles();
  const { colors } = useTheme();
  const create = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/vocab/buckets', {
        miniAppId,
        name: name.trim(),
        color,
      });
      onCreated(res.data.data);
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.card}>
      <Text style={s.heading}>Create a bucket</Text>
      <TextInput
        accessibilityLabel="Bucket name"
        maxLength={60}
        placeholder="e.g. Science words"
        placeholderTextColor={colors.text.muted}
        value={name}
        onChangeText={setName}
        style={s.input}
        autoFocus
      />
      <View style={s.row}>
        {BUCKET_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected: color === c }}
            accessibilityLabel={'Colour ' + c}
            onPress={() => setColor(c)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: c,
              borderWidth: color === c ? 3 : 0,
              borderColor: colors.text.primary,
            }}
          />
        ))}
      </View>
      <Text style={s.muted}>Starts private and included in quizzes.</Text>
      {!!error && <Text style={s.error}>{error}</Text>}
      <View style={s.row}>
        <BucketAction
          onPress={() => void create()}
          disabled={busy || !name.trim()}
        >
          {busy ? 'Creating…' : 'Create bucket'}
        </BucketAction>
        <BucketAction tone="neutral" onPress={onCancel} disabled={busy}>
          Cancel
        </BucketAction>
      </View>
    </View>
  );
}
