import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../AppText';
import { BucketAction, useBucketStyles } from './BucketControls';
import { CreateBucketForm } from './CreateBucketForm';
import type { useQuizBuckets } from '../../features/buckets/useQuizBuckets';

export function QuizBucketChoices({
  choice,
  onClose,
}: {
  choice: ReturnType<typeof useQuizBuckets>;
  onClose: () => void;
}) {
  const s = useBucketStyles();
  const router = useRouter();
  const [creating, setCreating] = useState<string>();
  if (choice.data && !choice.data.supported) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.heading}>Choose buckets</Text>
      {choice.loading && <ActivityIndicator />}
      {choice.error && (
        <>
          <Text style={s.error}>{choice.error}</Text>
          <BucketAction onPress={choice.reload}>Retry</BucketAction>
        </>
      )}
      {choice.data?.supported && (
        <>
          <Text style={s.muted}>
            {choice.bucketIds === null
              ? 'Using each bucket’s quiz default.'
              : 'These choices are saved for this quiz mode.'}
          </Text>
          <BucketAction tone="neutral" onPress={() => choice.setDraft(null)}>
            Use bucket defaults
          </BucketAction>
          {choice.data.buckets.map((b) => (
            <Pressable
              key={b._id}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: choice.selectedIds.includes(b._id),
              }}
              onPress={() => choice.toggle(b._id)}
              style={[s.card, { borderLeftColor: b.color, borderLeftWidth: 5 }]}
            >
              <Text style={s.text}>
                {choice.selectedIds.includes(b._id) ? '☑' : '☐'} {b.name}
              </Text>
              <Text style={s.muted}>{b.entryCount} saved meanings</Text>
            </Pressable>
          ))}
          {choice.missing && (
            <>
              <Text style={s.error}>
                A saved bucket is no longer available. Update your choices.
              </Text>
              <BucketAction
                onPress={() =>
                  choice.setDraft(
                    choice.selectedIds.filter((id) =>
                      choice.data?.buckets.some((b) => b._id === id)
                    )
                  )
                }
              >
                Remove unavailable choices
              </BucketAction>
            </>
          )}
          {choice.empty && (
            <Text style={s.text}>
              Choose a bucket with words, or add words to one below.
            </Text>
          )}
          {choice.data.miniAppIds.map((miniAppId) => (
            <View key={miniAppId} style={{ gap: 12 }}>
              <View style={s.row}>
                <BucketAction
                  tone="lime"
                  onPress={() => setCreating(miniAppId)}
                >
                  + Create bucket
                </BucketAction>
                <BucketAction
                  tone="neutral"
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: '/(app)/miniapp/[miniAppId]/bucket',
                      params: { miniAppId },
                    });
                  }}
                >
                  My buckets · add words
                </BucketAction>
              </View>
              {creating === miniAppId && (
                <CreateBucketForm
                  miniAppId={miniAppId}
                  onCancel={() => setCreating(undefined)}
                  onCreated={(b) => {
                    choice.setDraft([...choice.selectedIds, b._id]);
                    setCreating(undefined);
                    choice.reload();
                  }}
                />
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}
