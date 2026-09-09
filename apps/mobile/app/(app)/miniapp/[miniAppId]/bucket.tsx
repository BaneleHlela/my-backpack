import { useLocalSearchParams } from 'expo-router';
import { BucketWorkspace } from '../../../../src/components/buckets/BucketWorkspace';

export default function BucketsScreen() {
  const { miniAppId, bucketId } = useLocalSearchParams<{ miniAppId: string; bucketId?: string }>();
  return <BucketWorkspace miniAppId={miniAppId} bucketId={bucketId} />;
}
