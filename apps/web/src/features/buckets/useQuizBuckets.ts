import { useState } from 'react';
import type { QuizBucketOptions } from '@my-backpack/shared';
import api from '../../lib/axios';
import { useBucketResource } from './useBucketResource';

export function useQuizBuckets(
  source: { miniAppId?: string; quizId?: string; playModeId: string },
  initial?: string[] | null
) {
  const r = useBucketResource<QuizBucketOptions>(
    source.miniAppId || source.quizId ? '/vocab/buckets/quiz-options' : null,
    source
  );
  const [draft, setDraft] = useState<string[] | null | undefined>();
  const bucketIds =
    draft === undefined
      ? initial === undefined
        ? (r.data?.bucketIds ?? null)
        : initial
      : draft;
  const buckets = r.data?.buckets ?? [];
  const selectedIds =
    bucketIds ?? buckets.filter((b) => b.includeInQuiz).map((b) => b._id);
  const missing = selectedIds.some((id) => !buckets.some((b) => b._id === id));
  const empty =
    !selectedIds.length ||
    !buckets.some((b) => selectedIds.includes(b._id) && b.entryCount > 0);
  const ready =
    !(source.miniAppId || source.quizId) ||
    (!!r.data && (!r.data.supported || (!missing && !empty)));
  const toggle = (id: string) =>
    setDraft(
      selectedIds.includes(id)
        ? selectedIds.filter((v) => v !== id)
        : [...selectedIds, id]
    );
  const save = async () => {
    if (r.data?.supported)
      await api.put('/vocab/buckets/quiz-options', {
        quizId: r.data.quizId,
        playModeId: source.playModeId,
        bucketIds,
      });
  };
  return {
    ...r,
    bucketIds,
    selectedIds,
    setDraft,
    toggle,
    ready,
    missing,
    empty,
    save,
  };
}
