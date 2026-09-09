import { useState } from 'react';
import type { useQuizBuckets } from '../../features/buckets/useQuizBuckets';
import { BucketAction, bucketCard } from './BucketControls';
import { CreateBucketForm } from './CreateBucketForm';

export function QuizBucketChoices({
  choice,
  onManage,
}: {
  choice: ReturnType<typeof useQuizBuckets>;
  onManage: () => void;
}) {
  const [creating, setCreating] = useState<string>();
  if (choice.data && !choice.data.supported) return null;
  return (
    <section className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-left">
      <h3 className="font-bold text-slate-800">Choose buckets</h3>
      {choice.loading && <p role="status">Loading buckets…</p>}
      {choice.error && (
        <>
          <p role="alert" className="text-rose-700">
            {choice.error}
          </p>
          <BucketAction onClick={choice.reload}>Retry</BucketAction>
        </>
      )}
      {choice.data?.supported && (
        <>
          <p className="text-sm text-slate-600">
            {choice.bucketIds === null
              ? 'Using each bucket’s quiz default.'
              : 'These choices are saved for this quiz.'}
          </p>
          <BucketAction tone="neutral" onClick={() => choice.setDraft(null)}>
            Use bucket defaults
          </BucketAction>
          <div className="max-h-64 space-y-2 overflow-y-auto p-1">
            {choice.data.buckets.map((b) => (
              <label
                key={b._id}
                className={`${bucketCard} flex cursor-pointer items-center gap-3`}
                style={{ borderLeft: `5px solid ${b.color}` }}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-violet-600"
                  checked={choice.selectedIds.includes(b._id)}
                  onChange={() => choice.toggle(b._id)}
                />
                <span>
                  {b.name}
                  <small className="block text-slate-500">
                    {b.entryCount} saved meanings
                  </small>
                </span>
              </label>
            ))}
          </div>
          {choice.missing && (
            <>
              <p className="text-rose-700">
                A saved bucket is no longer available. Update your choices.
              </p>
              <BucketAction
                onClick={() =>
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
            <p>Choose a bucket with words, or add words to one below.</p>
          )}
          <BucketAction tone="neutral" onClick={onManage}>
            My buckets · add words
          </BucketAction>
          {choice.data.miniAppIds.map((miniAppId) => (
            <div key={miniAppId}>
              {creating === miniAppId ? (
                <CreateBucketForm
                  miniAppId={miniAppId}
                  onCancel={() => setCreating(undefined)}
                  onCreated={(b) => {
                    choice.setDraft([...choice.selectedIds, b._id]);
                    setCreating(undefined);
                    choice.reload();
                  }}
                />
              ) : (
                <BucketAction
                  tone="lime"
                  onClick={() => setCreating(miniAppId)}
                >
                  + Create bucket
                </BucketAction>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
