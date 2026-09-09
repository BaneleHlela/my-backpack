import { useState } from 'react';
import type { BucketWordPreview } from '@my-backpack/shared';
import api from '../../lib/axios';
import { bucketError } from './useBucketResource';

type Suggestion = { word: string; hint?: string; partOfSpeech?: string };

// Suggestions never become saved definitions. Every saved ID comes from a dictionary response
// and an explicit meaning selection. The default path performs external lookups one tap at a time.
export function useBucketWordImport(
  bucketId: string,
  miniAppId: string,
  onSaved: () => void
) {
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [previews, setPreviews] = useState<BucketWordPreview[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  const preview = async (words: Suggestion[]) => {
    const res = await api.post(
      `/vocab/buckets/${bucketId}/preview`,
      { words: words.map((w) => w.word) },
      { timeout: 180000 }
    );
    setPreviews(
      (res.data.data.previews as BucketWordPreview[]).map((p) => ({
        ...p,
        hint: words.find((w) => w.word === p.word)?.hint,
      }))
    );
    setSelected([]);
  };
  const previewList = () =>
    run(async () => {
      const words = [
        ...new Set(
          text
            .split(/[,\n]/)
            .map((w) => w.trim().toLowerCase())
            .filter(Boolean)
        ),
      ];
      if (!words.length || words.length > 20)
        throw new Error('Enter 1–20 words, separated by commas or new lines.');
      await preview(words.map((word) => ({ word })));
    });
  const recommend = () =>
    run(async () => {
      const res = await api.post(`/vocab/buckets/${bucketId}/recommendations`, {
        topic: topic.trim() || undefined,
        count: 10,
      });
      const words = res.data.data.suggestions as Suggestion[];
      if (!words.length)
        throw new Error(
          'No new suggestions this time. Try a more specific topic.'
        );
      // Retain the list even if the separate dictionary preview fails, so retrying costs no AI tokens.
      setText(words.map((w) => w.word).join(', '));
      await preview(words);
    });
  const lookup = (word: string) =>
    run(async () => {
      const res = await api.get('/vocab/search', {
        params: { miniAppId, word },
      });
      const data = res.data.data as {
        term: { _id: string; word: string };
        definitions: BucketWordPreview['definitions'];
      };
      setPreviews((prev) =>
        prev.map((p) =>
          p.word === word
            ? {
                ...p,
                termId: data.term._id,
                definitions: data.definitions,
                status: 'ready',
              }
            : p
        )
      );
    });
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  const save = () =>
    run(async () => {
      await api.post(`/vocab/buckets/${bucketId}/entries`, {
        definitionIds: selected,
      });
      onSaved();
    });
  return {
    topic,
    setTopic,
    text,
    setText,
    previews,
    selected,
    busy,
    error,
    previewList,
    recommend,
    lookup,
    toggle,
    save,
  };
}
