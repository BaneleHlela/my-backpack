import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { VocabularyBucket } from '@my-backpack/shared';
import { Text } from '../AppText';
import api from '../../lib/api';
import {
  bucketError,
  useBucketResource,
} from '../../features/buckets/useBucketResource';
import { BucketAction, BucketSheet, useBucketStyles } from './BucketControls';
import { CreateBucketForm } from './CreateBucketForm';

export function BucketPickerSheet({
  miniAppId,
  definitionId,
  onClose,
  onSaved,
}: {
  miniAppId: string;
  definitionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, error, reload } = useBucketResource<{
    buckets: VocabularyBucket[];
    bucketIds: string[];
  }>('/vocab/buckets/memberships', { miniAppId, definitionId });
  const [selected, setSelected] = useState<string[]>([]);
  const [added, setAdded] = useState<VocabularyBucket[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const s = useBucketStyles();
  useEffect(() => {
    if (data) setSelected(data.bucketIds);
  }, [data]);
  const save = async () => {
    if (!data || busy) return;
    setBusy(true);
    setSaveError('');
    try {
      await api.put('/vocab/buckets/memberships', {
        miniAppId,
        definitionId,
        bucketIds: selected,
      });
      onSaved();
      onClose();
    } catch (e) {
      setSaveError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BucketSheet
      title="Save to buckets"
      onClose={onClose}
      busy={busy}
      footer={
        <BucketAction disabled={!data || busy} onPress={() => void save()}>
          Save selection
        </BucketAction>
      }
    >
      <Text style={s.muted}>
        Choose where to keep this meaning. Unchecking a bucket removes only this
        meaning from it.
      </Text>
      {error ? (
        <>
          <Text style={s.error}>{error}</Text>
          <BucketAction onPress={reload}>Retry</BucketAction>
        </>
      ) : !data ? (
        <ActivityIndicator />
      ) : null}
      {[...(data?.buckets ?? []), ...added].map((b) => (
        <Pressable
          key={b._id}
          disabled={busy}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected.includes(b._id) }}
          onPress={() =>
            setSelected((ids) =>
              ids.includes(b._id)
                ? ids.filter((id) => id !== b._id)
                : [...ids, b._id]
            )
          }
          style={[s.card, { borderColor: b.color }]}
        >
          <View style={s.between}>
            <Text style={s.heading}>
              {b.isFavorites ? '★ ' : ''}
              {b.name}
            </Text>
            <Text style={s.text}>{selected.includes(b._id) ? '✓' : '○'}</Text>
          </View>
          <Text style={s.muted}>
            {b.entryCount} meanings · {b.visibility}
          </Text>
        </Pressable>
      ))}
      {creating ? (
        <CreateBucketForm
          miniAppId={miniAppId}
          onCancel={() => setCreating(false)}
          onCreated={(b) => {
            setAdded((old) => [...old, b]);
            setSelected((old) => [...old, b._id]);
            setCreating(false);
          }}
        />
      ) : (
        <BucketAction
          tone="neutral"
          disabled={busy}
          onPress={() => setCreating(true)}
        >
          + Create bucket
        </BucketAction>
      )}
      {!!saveError && <Text style={s.error}>{saveError}</Text>}
    </BucketSheet>
  );
}
