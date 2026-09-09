import { useState } from 'react';
import { BUCKET_COLORS, type VocabularyBucket } from '@my-backpack/shared';
import api from '../../lib/axios';
import { bucketError } from '../../features/buckets/useBucketResource';
import { BucketAction, bucketCard, bucketInput } from './BucketControls';

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
    <div className={bucketCard}>
      <h3 className="font-bold">Create a bucket</h3>
      <label className="block">
        Name
        <input
          autoFocus
          maxLength={60}
          placeholder="e.g. Science words"
          className={bucketInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void create();
            }
          }}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {BUCKET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={'Colour ' + c}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
            className={`h-10 w-10 rounded-full ${color === c ? 'ring-2 ring-slate-800 ring-offset-2' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Starts private and included in quizzes.
      </p>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <BucketAction
          disabled={busy || !name.trim()}
          onClick={() => void create()}
        >
          {busy ? 'Creating…' : 'Create bucket'}
        </BucketAction>
        <BucketAction tone="neutral" onClick={onCancel} disabled={busy}>
          Cancel
        </BucketAction>
      </div>
    </div>
  );
}
