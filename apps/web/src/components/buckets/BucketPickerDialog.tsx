import { useState } from 'react';
import type { VocabularyBucket } from '@my-backpack/shared';
import api from '../../lib/axios';
import {
  bucketError,
  useBucketResource,
} from '../../features/buckets/useBucketResource';
import { BucketAction, BucketDialog, bucketCard } from './BucketControls';
import { CreateBucketForm } from './CreateBucketForm';

export function BucketPickerDialog({
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
  const r = useBucketResource<{
    buckets: VocabularyBucket[];
    bucketIds: string[];
  }>('/vocab/buckets/memberships', { miniAppId, definitionId });
  const [draft, setDraft] = useState<string[]>();
  const selected = draft ?? r.data?.bucketIds ?? [];
  const [added, setAdded] = useState<VocabularyBucket[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy || !r.data) return;
    setBusy(true);
    setError('');
    try {
      await api.put('/vocab/buckets/memberships', {
        miniAppId,
        definitionId,
        bucketIds: selected,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BucketDialog
      title="Choose buckets"
      onClose={onClose}
      busy={busy}
      footer={
        <BucketAction
          disabled={busy || !r.data}
          tone="lime"
          onClick={() => void save()}
        >
          Save choices
        </BucketAction>
      }
    >
      <p className="text-sm text-slate-600">
        Save this meaning in as many buckets as you like.
      </p>
      {r.loading && <p role="status">Loading buckets…</p>}
      {(r.error || error) && (
        <p role="alert" className="text-rose-700">
          {error || r.error}
        </p>
      )}
      {r.error && <BucketAction onClick={r.reload}>Retry</BucketAction>}
      {[...(r.data?.buckets ?? []), ...added].map((b) => (
        <label
          key={b._id}
          className={`${bucketCard} flex cursor-pointer items-center gap-3`}
          style={{ borderLeft: `5px solid ${b.color}` }}
        >
          <input
            type="checkbox"
            disabled={busy}
            checked={selected.includes(b._id)}
            onChange={() =>
              setDraft(
                selected.includes(b._id)
                  ? selected.filter((id) => id !== b._id)
                  : [...selected, b._id]
              )
            }
            className="h-5 w-5 accent-violet-600"
          />
          <span>
            {b.name}
            <small className="block text-slate-500">
              {b.entryCount} saved meanings
            </small>
          </span>
        </label>
      ))}
      {creating ? (
        <CreateBucketForm
          miniAppId={miniAppId}
          onCancel={() => setCreating(false)}
          onCreated={(b) => {
            setAdded([...added, b]);
            setDraft([...selected, b._id]);
            setCreating(false);
          }}
        />
      ) : (
        <BucketAction disabled={busy} onClick={() => setCreating(true)}>
          + Create bucket
        </BucketAction>
      )}
    </BucketDialog>
  );
}
