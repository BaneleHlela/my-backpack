import type { VocabularyBucket } from '@my-backpack/shared';
import { useBucketWordImport } from '../../features/buckets/useBucketWordImport';
import {
  BucketAction,
  BucketDialog,
  bucketCard,
  bucketInput,
} from './BucketControls';

export function BucketWordsDialog({
  bucket,
  onClose,
  onSaved,
}: {
  bucket: VocabularyBucket;
  onClose: () => void;
  onSaved: () => void;
}) {
  const f = useBucketWordImport(bucket._id, bucket.miniAppId, () => {
    onSaved();
    onClose();
  });
  return (
    <BucketDialog
      title={'Add words to ' + bucket.name}
      busy={f.busy}
      onClose={onClose}
      footer={
        <BucketAction
          tone="lime"
          disabled={f.busy || !f.selected.length || f.selected.length > 20}
          onClick={() => void f.save()}
        >
          Add {f.selected.length} selected meanings
        </BucketAction>
      }
    >
      <div className="space-y-3">
        <h3 className="font-bold">Get word ideas</h3>
        <p className="text-sm text-slate-600">
          Ask AI for 10 words. You choose the dictionary meanings below.
        </p>
        <label className="block">
          Topic
          <input
            className={bucketInput}
            placeholder="e.g. space exploration"
            value={f.topic}
            onChange={(e) => f.setTopic(e.target.value)}
            maxLength={160}
            disabled={f.busy}
          />
        </label>
        <BucketAction disabled={f.busy} onClick={() => void f.recommend()}>
          Suggest 10 words
        </BucketAction>
      </div>
      <div className="space-y-3">
        <label className="block font-bold">
          Or paste a word list
          <textarea
            className={`${bucketInput} mt-2 min-h-28 font-normal`}
            placeholder="Up to 20 words, separated by commas or new lines"
            value={f.text}
            onChange={(e) => f.setText(e.target.value)}
            maxLength={1400}
            disabled={f.busy}
          />
        </label>
        <BucketAction
          tone="neutral"
          disabled={f.busy || !f.text.trim()}
          onClick={() => void f.previewList()}
        >
          Review dictionary meanings
        </BucketAction>
        <p className="text-sm text-slate-600">
          <a
            className="underline text-violet-700"
            href="https://www.merriam-webster.com/vocabulary/see-all"
            target="_blank"
            rel="noreferrer"
          >
            Browse Merriam-Webster vocabulary collections ↗
          </a>
          <br />
          Bring the words you want to learn from a collection, then review their
          meanings here.
        </p>
      </div>
      {f.busy && <p role="status">Preparing your words…</p>}
      {f.error && (
        <p role="alert" className="text-rose-700">
          {f.error}
        </p>
      )}
      {f.previews.map((p) => (
        <div key={p.word} className={bucketCard}>
          <h3 className="text-lg font-bold">{p.word}</h3>
          {p.hint && (
            <p className="text-sm text-slate-600">Suggested sense: {p.hint}</p>
          )}
          {p.status === 'ready' && !p.definitions.length && (
            <p>No dictionary meanings available. Try another spelling.</p>
          )}
          {p.definitions.map((d) => (
            <label
              key={d._id}
              className="flex cursor-pointer items-start gap-3 border-t py-3"
            >
              <input
                type="checkbox"
                disabled={f.busy}
                checked={f.selected.includes(d._id)}
                onChange={() => f.toggle(d._id)}
                className="mt-1 h-5 w-5 shrink-0 accent-violet-600"
              />
              <span>
                <small className="block text-slate-500">{d.partOfSpeech}</small>
                {d.definition}
              </span>
            </label>
          ))}
          {p.status !== 'ready' && (
            <>
              <p className="text-sm text-slate-600">
                {p.status === 'not_found'
                  ? 'No matching dictionary entry. Try another spelling.'
                  : 'Look this word up to choose a meaning.'}
              </p>
              <BucketAction
                tone="neutral"
                disabled={f.busy}
                onClick={() => void f.lookup(p.word)}
              >
                Look up {p.word}
              </BucketAction>
            </>
          )}
        </div>
      ))}
    </BucketDialog>
  );
}
