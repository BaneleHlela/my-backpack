// Session start screen: a primary "Start Quiz" (sensible defaults) and a
// secondary "Customize" affordance that reveals question count, bucket
// filter, and question type selection.
//
// Note: the backend's bucketFilter enum is 'all' | 'learning' | 'mastered' —
// there is no 'paused' option on QuizSession (BucketEntry has a 'paused'
// status, but sessions can't filter by it), so the picker offers the three
// values the API actually accepts.
import { useState } from 'react';
import { Settings2, Loader2 } from 'lucide-react';
import type { QuestionType, BucketFilter, FeedbackMode } from '@my-backpack/shared';

const TEXT_TYPES: { type: QuestionType; label: string }[] = [
  { type: 'mcq_term_to_def', label: 'Term → definition (MCQ)' },
  { type: 'mcq_def_to_term', label: 'Definition → term (MCQ)' },
  { type: 'mcq_correct_usage', label: 'Correct usage (MCQ)' },
  { type: 'mcq_incorrect_usage', label: 'Incorrect usage (MCQ)' },
  { type: 'mcq_fill_blank', label: 'Fill the blank (MCQ)' },
  { type: 'fill_blank_typed', label: 'Fill the blank (typed)' },
  { type: 'true_false_term_def', label: 'True/false: term → definition' },
  { type: 'true_false_def_term', label: 'True/false: definition → term' },
  { type: 'true_false_usage', label: 'True/false: usage' },
  { type: 'text_input_def', label: 'Type the term (from definition)' },
  { type: 'text_input_audio', label: 'Type the term (from audio)' },
  { type: 'text_input_example', label: 'Type the term (from example)' },
];

const DND_TYPES: { type: QuestionType; label: string }[] = [
  { type: 'dnd_single', label: 'Drag: single item' },
  { type: 'dnd_select', label: 'Drag: select correct' },
  { type: 'dnd_count', label: 'Drag: count items' },
  { type: 'dnd_sort', label: 'Drag: sort into categories' },
  { type: 'dnd_sequence', label: 'Drag: arrange in order' },
  { type: 'dnd_match', label: 'Drag: match pairs' },
  { type: 'dnd_fill', label: 'Drag: fill sentence blanks' },
  { type: 'dnd_build', label: 'Drag: build a word' },
];

const BUCKET_FILTERS: { value: BucketFilter; label: string }[] = [
  { value: 'learning', label: 'Learning' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'all', label: 'All' },
];

const FEEDBACK_MODES: { value: FeedbackMode; label: string; description: string }[] = [
  { value: 'immediate', label: 'After each question', description: 'See if you got it right before moving on' },
  { value: 'end', label: 'At the end', description: 'Answer all questions, then review your results' },
];

export interface QuizStartSettings {
  questionCount: number;
  bucketFilter: BucketFilter;
  questionTypes?: QuestionType[];
  feedbackMode: FeedbackMode;
}

interface QuizStartScreenProps {
  isStarting: boolean;
  onStart: (settings: QuizStartSettings) => void;
}

export default function QuizStartScreen({ isStarting, onStart }: QuizStartScreenProps) {
  const [customizing, setCustomizing] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('learning');
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('immediate');
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(
    new Set(TEXT_TYPES.map((t) => t.type))
  );

  const toggleType = (type: QuestionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const startDefault = () => {
    onStart({ questionCount: 10, bucketFilter: 'learning', feedbackMode: 'immediate' });
  };

  const startCustom = () => {
    onStart({
      questionCount,
      bucketFilter,
      feedbackMode,
      questionTypes: selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined,
    });
  };

  return (
    <div className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-8 text-center">
      <span className="text-5xl">🧠</span>
      <h2 className="text-xl font-bold text-gray-800 mt-3">Ready to test yourself?</h2>
      <p className="text-sm text-gray-500 mt-1">
        10 questions from the words you're learning.
      </p>

      <button
        type="button"
        disabled={isStarting}
        onClick={startDefault}
        className="w-full mt-6 py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
      >
        {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
        Start Quiz
      </button>

      <button
        type="button"
        onClick={() => setCustomizing((v) => !v)}
        className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        {customizing ? 'Hide customize' : 'Customize'}
      </button>

      {customizing && (
        <div className="mt-6 text-left space-y-5 border-t border-white/40 pt-5">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Question count
            </label>
            <input
              type="number"
              min={5}
              max={25}
              value={questionCount}
              onChange={(e) =>
                setQuestionCount(Math.min(25, Math.max(5, Number(e.target.value) || 5)))
              }
              className="mt-1.5 w-24 px-3 py-2 rounded-xl bg-white/50 border border-white/50 outline-none text-gray-800 focus:border-violet-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Bucket filter
            </label>
            <div className="flex gap-2 mt-1.5">
              {BUCKET_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setBucketFilter(f.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    bucketFilter === f.value
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/50 text-gray-700 hover:bg-white/70'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Show results
            </label>
            <div className="flex flex-col gap-2 mt-1.5">
              {FEEDBACK_MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                    feedbackMode === m.value
                      ? 'bg-violet-500/10 border-violet-400'
                      : 'bg-white/50 border-white/50 hover:bg-white/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="feedbackMode"
                    checked={feedbackMode === m.value}
                    onChange={() => setFeedbackMode(m.value)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">{m.label}</span>
                    <span className="block text-xs text-gray-500">{m.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Question types
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5 max-h-56 overflow-y-auto pr-1">
              {TEXT_TYPES.map(({ type, label }) => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-white/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type)}
                    onChange={() => toggleType(type)}
                    className="accent-violet-500"
                  />
                  {label}
                </label>
              ))}
              {DND_TYPES.map(({ type, label }) => (
                <label
                  key={type}
                  title="Drag-and-drop questions are coming soon"
                  className="flex items-center gap-2 text-sm text-gray-400 px-2 py-1 rounded-lg cursor-not-allowed"
                >
                  <input type="checkbox" checked={false} disabled className="accent-gray-300" />
                  {label}
                  <span className="text-[10px] text-gray-400">(coming soon)</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isStarting}
            onClick={startCustom}
            className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
            Start customized quiz
          </button>
        </div>
      )}
    </div>
  );
}
