// Shared UI for fill_blank_typed, text_input_def, text_input_audio, text_input_example —
// a text input + submit button. content.prompt already carries the full instruction text.
//
// text_input_audio: the generator doesn't tag content.prompt with the "audio:" prefix
// convention for this type (it only stores instructional text), so there's no GCS path
// on the question itself. We resolve the audio by fetching the term's audioUrl via the
// existing GET /api/vocab/terms/:termId endpoint — no new backend route needed. If a
// future prompt DOES use the "audio:" prefix, that takes priority.
import { useEffect, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { ASSETS } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers, QuestionType } from '@my-backpack/shared';
import axiosInstance from '../../../lib/axios';
import SpokenText from '../SpokenText';

interface TypedInputPatternProps {
  type: QuestionType;
  termId?: string;
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  lang: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
}

export default function TypedInputPattern({
  type,
  termId,
  content,
  lang,
  disabled,
  isSubmitting,
  onAnswer,
}: TypedInputPatternProps) {
  const [value, setValue] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const promptIsAudio = content.prompt?.startsWith('audio:') ?? false;

  useEffect(() => {
    setValue('');
    setAudioUrl(promptIsAudio ? `${ASSETS.GCS_BASE}/${content.prompt!.slice('audio:'.length)}` : null);

    if (!promptIsAudio && type === 'text_input_audio' && termId) {
      setAudioLoading(true);
      axiosInstance
        .get(`/vocab/terms/${termId}`)
        .then((res) => setAudioUrl(res.data.data.term.audioUrl ?? null))
        .catch(() => setAudioUrl(null))
        .finally(() => setAudioLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, type, content.prompt]);

  const playAudio = () => {
    if (!audioUrl) return;
    void new Audio(audioUrl).play();
  };

  const submit = () => {
    if (disabled || !value.trim()) return;
    onAnswer(value.trim());
  };

  return (
    <div className="space-y-4">
      {promptIsAudio || type === 'text_input_audio' ? (
        <p className="text-lg text-gray-800 whitespace-pre-line">{content.prompt}</p>
      ) : (
        <SpokenText text={content.prompt ?? ''} lang={lang} />
      )}

      {type === 'text_input_audio' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playAudio}
            disabled={!audioUrl || audioLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors"
          >
            {audioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            Play audio
          </button>
          {!audioLoading && !audioUrl && (
            <span className="text-xs text-gray-400">No audio available for this word.</span>
          )}
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full px-4 py-3 rounded-2xl bg-white/40 border border-white/50 outline-none text-gray-800 placeholder-gray-400 focus:border-violet-400 transition-colors disabled:opacity-60"
      />

      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={submit}
        className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
}
