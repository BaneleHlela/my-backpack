import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  BUCKET_COLORS,
  type IMiniApp,
  type VocabularyBucket,
  type BucketWord,
} from '@my-backpack/shared';
import type { RootState } from '../../app/store';
import api from '../../lib/axios';
import {
  bucketError,
  useBucketResource,
} from '../../features/buckets/useBucketResource';
import {
  BucketAction,
  BucketDialog,
  bucketCard,
  bucketInput,
} from '../../components/buckets/BucketControls';
import { CreateBucketForm } from '../../components/buckets/CreateBucketForm';
import { BucketWordsDialog } from '../../components/buckets/BucketWordsDialog';

export default function BucketPage({
  miniApp,
  subjectSlug,
}: {
  miniApp: IMiniApp;
  subjectSlug: string;
}) {
  const { fieldSlug, miniAppSlug } = useParams();
  const [params] = useSearchParams();
  const profileId = useSelector((s: RootState) => s.auth.activeProfile?._id);
  const base = `/field/${fieldSlug}/subject/${subjectSlug}/miniapp/${miniAppSlug}`;
  const bucketId = params.get('bucketId');
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {bucketId ? (
        <BucketDetail
          key={`${profileId}:${bucketId}`}
          bucketId={bucketId}
          base={base}
        />
      ) : (
        <BucketList
          key={`${profileId}:${miniApp._id}`}
          miniAppId={miniApp._id}
          base={base}
        />
      )}
    </main>
  );
}

function BucketList({ miniAppId, base }: { miniAppId: string; base: string }) {
  const navigate = useNavigate();
  const [discover, setDiscover] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const r = useBucketResource<{
    buckets: VocabularyBucket[];
    hasMore?: boolean;
  }>(discover ? '/vocab/buckets/discover' : '/vocab/buckets', {
    miniAppId,
    search: query,
    page,
  });
  const open = (id: string) => navigate(`${base}/bucket?bucketId=${id}`);
  return (
    <div className="space-y-5">
      <button
        type="button"
        className="text-sm text-violet-700"
        onClick={() => navigate(base)}
      >
        ← Dictionary
      </button>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My buckets</h1>
          <p className="text-slate-600">
            A home for every word you want to learn.
          </p>
        </div>
        <div className="flex gap-3">
          <BucketAction tone="lime" onClick={() => setCreating(true)}>
            + Create bucket
          </BucketAction>
          <BucketAction onClick={() => navigate(`${base}/quiz`)}>
            Quiz
          </BucketAction>
        </div>
      </div>
      <div className="flex gap-3">
        {[false, true].map((v) => (
          <BucketAction
            key={String(v)}
            tone={discover === v ? 'violet' : 'neutral'}
            onClick={() => {
              setDiscover(v);
              setPage(1);
              setSearch('');
              setQuery('');
            }}
          >
            {v ? 'Discover public' : 'My buckets'}
          </BucketAction>
        ))}
      </div>
      {discover && (
        <form
          className="flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search);
          }}
        >
          <input
            aria-label="Search public buckets"
            className={bucketInput}
            placeholder="Search public buckets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={60}
          />
          <BucketAction type="submit" tone="neutral">
            Search
          </BucketAction>
        </form>
      )}
      {r.loading && <p role="status">Loading buckets…</p>}
      {r.error && (
        <div role="alert">
          <p className="mb-3 text-rose-700">{r.error}</p>
          <BucketAction onClick={r.reload}>Retry</BucketAction>
        </div>
      )}
      {r.data?.buckets.length === 0 && (
        <div className={bucketCard}>
          <h2 className="text-xl font-bold">
            {discover ? 'No public buckets found' : 'Create your first bucket'}
          </h2>
          <p>Try another search, or create a collection of your own.</p>
          <BucketAction onClick={() => setCreating(true)}>
            Create bucket
          </BucketAction>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {r.data?.buckets.map((b) => (
          <button
            type="button"
            key={b._id}
            onClick={() => open(b._id)}
            className={`${bucketCard} text-left transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-500`}
            style={{ borderTop: `6px solid ${b.color}` }}
          >
            <h2 className="text-xl font-bold">
              {b.isFavorites ? '★ ' : ''}
              {b.name}
            </h2>
            {b.description && (
              <p className="text-sm text-slate-600">{b.description}</p>
            )}
            <p className="text-sm">
              {b.entryCount} saved meanings · {b.visibility}
            </p>
            {b.isOwner && (
              <p className="text-xs text-slate-500">
                {b.includeInQuiz
                  ? 'Included in quizzes by default'
                  : 'Excluded from quizzes by default'}
              </p>
            )}
            {b.isOwner && b.entryCount === 0 && (
              <p className="font-semibold text-violet-700">
                Add your first words →
              </p>
            )}
          </button>
        ))}
      </div>
      {discover && (
        <div className="flex items-center gap-3">
          <BucketAction
            tone="neutral"
            disabled={page === 1 || r.loading}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </BucketAction>
          <span>Page {page}</span>
          <BucketAction
            tone="neutral"
            disabled={!r.data?.hasMore || r.loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </BucketAction>
        </div>
      )}
      {creating && (
        <BucketDialog title="New bucket" onClose={() => setCreating(false)}>
          <CreateBucketForm
            miniAppId={miniAppId}
            onCancel={() => setCreating(false)}
            onCreated={(b) => open(b._id)}
          />
        </BucketDialog>
      )}
    </div>
  );
}

function BucketDetail({ bucketId, base }: { bucketId: string; base: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const r = useBucketResource<{
    bucket: VocabularyBucket;
    words: BucketWord[];
    hasMore: boolean;
  }>(`/vocab/buckets/${bucketId}`, { page, status, sort, search: query });
  const b = r.data?.bucket;
  const run = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
      r.reload();
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <button
        type="button"
        className="text-sm text-violet-700"
        onClick={() => navigate(`${base}/bucket`)}
      >
        ← My buckets
      </button>
      {r.loading && <p role="status">Loading bucket…</p>}
      {(error || r.error) && (
        <div role="alert">
          <p className="mb-3 text-rose-700">{error || r.error}</p>
          <BucketAction onClick={r.reload}>Reload bucket</BucketAction>
        </div>
      )}
      {notice && (
        <p role="status" className="text-violet-700">
          {notice}
        </p>
      )}
      {b && (
        <>
          <div
            className={bucketCard}
            style={{ borderTop: `6px solid ${b.color}` }}
          >
            <h1 className="text-3xl font-bold">
              {b.isFavorites ? '★ ' : ''}
              {b.name}
            </h1>
            <p className="text-sm text-slate-500">
              {b.entryCount} saved meanings · {b.visibility}
            </p>
            {b.description && <p>{b.description}</p>}
            {b.isOwner ? (
              <>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-violet-600"
                    disabled={busy}
                    checked={b.includeInQuiz}
                    onChange={(e) =>
                      void run(() =>
                        api.patch(`/vocab/buckets/${bucketId}`, {
                          includeInQuiz: e.target.checked,
                        })
                      )
                    }
                  />
                  Include in quizzes by default
                </label>
                <p className="text-sm text-slate-500">
                  Each quiz can use these defaults or its own bucket choices.
                </p>
                <div className="flex flex-wrap gap-3">
                  <BucketAction
                    tone="lime"
                    disabled={busy}
                    onClick={() => setAdding(true)}
                  >
                    + Add words
                  </BucketAction>
                  <BucketAction
                    disabled={busy || !b.entryCount}
                    onClick={() =>
                      navigate(`${base}/quiz?bucketId=${bucketId}`)
                    }
                  >
                    Quiz this bucket
                  </BucketAction>
                  <BucketAction
                    tone="neutral"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    Edit bucket
                  </BucketAction>
                </div>
              </>
            ) : (
              <>
                <p>
                  Save a private copy to edit it and use it in your quizzes.
                </p>
                <BucketAction
                  tone="lime"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const res = await api.post(
                        `/vocab/buckets/${bucketId}/copy`
                      );
                      navigate(
                        `${base}/bucket?bucketId=${res.data.data.bucketId}`
                      );
                    })
                  }
                >
                  {busy ? 'Saving…' : 'Save a copy'}
                </BucketAction>
              </>
            )}
            {b.visibility === 'public' && (
              <BucketAction
                tone="neutral"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}${base}/bucket?bucketId=${bucketId}`
                    );
                    setNotice('Bucket link copied.');
                  })
                }
              >
                Copy share link
              </BucketAction>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {b.isOwner && (
              <label className="text-sm">
                Status{' '}
                <select
                  className="rounded-xl border border-slate-300 p-3"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {['all', 'learning', 'mastered', 'paused'].map((v) => (
                    <option key={v} value={v}>
                      {v[0].toUpperCase() + v.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search);
                setPage(1);
              }}
            >
              <input
                aria-label="Find a word in this bucket"
                className={bucketInput}
                placeholder="Find a word"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={60}
              />
              <BucketAction type="submit" tone="neutral">
                Search
              </BucketAction>
            </form>
          </div>
          <label className="block text-sm">
            Sort{' '}
            <select
              className="rounded-xl border border-slate-300 p-3"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              {[
                ['recent', 'Recently added'],
                ['alphabetical', 'Alphabetical'],
                ...(b.isOwner
                  ? [
                      ['confidence', 'Confidence'],
                      ['accuracy', 'Accuracy'],
                      ['lastPracticed', 'Last practised'],
                      ['dueForReview', 'Due for review'],
                    ]
                  : []),
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!r.data?.words.length && (
            <div className={bucketCard}>
              <h2 className="text-xl font-bold">
                {b.entryCount
                  ? 'No words match this view'
                  : 'Your next word starts here'}
              </h2>
              <p>
                {b.entryCount
                  ? 'Try another search or status filter.'
                  : 'Add words, paste a collection, or ask for word ideas.'}
              </p>
              {b.isOwner && (
                <BucketAction onClick={() => setAdding(true)}>
                  Add words
                </BucketAction>
              )}
            </div>
          )}
          {r.data?.words.map((w) => (
            <div key={w._id} className={bucketCard}>
              <button
                type="button"
                className="text-xl font-bold text-violet-700"
                onClick={() => navigate(`${base}/term/${w.termId}`)}
              >
                {w.word} ↗
              </button>
              <p className="text-xs text-slate-500">{w.partOfSpeech}</p>
              <p>{w.definition}</p>
              {b.isOwner && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {w.status} · {Math.round((w.confidenceScore ?? 0) * 100)}%
                    confidence
                  </p>
                  <div className="flex gap-2">
                    <BucketAction
                      tone="neutral"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          api.patch(
                            `/vocab/buckets/${bucketId}/entries/${w._id}`,
                            { paused: w.status !== 'paused' }
                          )
                        )
                      }
                    >
                      {w.status === 'paused' ? 'Resume' : 'Pause'}
                    </BucketAction>
                    <BucketAction
                      tone="neutral"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove “${w.word}” from ${b.name}? Your learning progress is kept.`
                          )
                        )
                          void run(() =>
                            api.delete(
                              `/vocab/buckets/${bucketId}/entries/${w._id}`
                            )
                          );
                      }}
                    >
                      Remove
                    </BucketAction>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <BucketAction
              tone="neutral"
              disabled={page === 1 || busy}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </BucketAction>
            <span>Page {page}</span>
            <BucketAction
              tone="neutral"
              disabled={!r.data?.hasMore || busy}
              onClick={() => setPage(page + 1)}
            >
              Next
            </BucketAction>
          </div>
          {adding && (
            <BucketWordsDialog
              bucket={b}
              onClose={() => setAdding(false)}
              onSaved={r.reload}
            />
          )}
          {editing && (
            <EditBucket
              bucket={b}
              onClose={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                r.reload();
              }}
              onDeleted={() => navigate(`${base}/bucket`)}
            />
          )}
        </>
      )}
    </div>
  );
}

function EditBucket({
  bucket,
  onClose,
  onSaved,
  onDeleted,
}: {
  bucket: VocabularyBucket;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(bucket.name);
  const [description, setDescription] = useState(bucket.description);
  const [color, setColor] = useState(bucket.color);
  const [isPublic, setPublic] = useState(bucket.visibility === 'public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (deleting = false) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (deleting) {
        await api.delete(`/vocab/buckets/${bucket._id}`);
        onDeleted();
      } else {
        await api.patch(`/vocab/buckets/${bucket._id}`, {
          name,
          description,
          color,
          visibility: isPublic ? 'public' : 'private',
        });
        onSaved();
      }
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BucketDialog
      title="Edit bucket"
      busy={busy}
      onClose={onClose}
      footer={
        <BucketAction
          disabled={busy || !name.trim()}
          onClick={() => void run()}
        >
          Save changes
        </BucketAction>
      }
    >
      <label className="block">
        Name
        <input
          className={bucketInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          disabled={bucket.isFavorites || busy}
        />
      </label>
      <label className="block">
        Description
        <textarea
          className={bucketInput}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={240}
          disabled={busy}
        />
      </label>
      <div className="flex gap-3">
        {BUCKET_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            aria-label={'Colour ' + c}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
            style={{ backgroundColor: c }}
            className={`h-10 w-10 rounded-full ${color === c ? 'ring-2 ring-slate-800 ring-offset-2' : ''}`}
          />
        ))}
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-violet-600"
          checked={isPublic}
          onChange={(e) => setPublic(e.target.checked)}
          disabled={busy}
        />
        Public bucket
      </label>
      <p className="text-sm text-slate-600">
        {isPublic
          ? 'Anyone using this dictionary can find these words and save a copy. Your learning progress stays private. Existing copies remain if you make this private later.'
          : 'Only this profile can see this bucket.'}
      </p>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {!bucket.isFavorites && (
        <BucketAction
          tone="neutral"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                `Delete “${bucket.name}” and its saved words? Your other buckets and learning progress are kept.`
              )
            )
              void run(true);
          }}
        >
          Delete bucket
        </BucketAction>
      )}
    </BucketDialog>
  );
}
