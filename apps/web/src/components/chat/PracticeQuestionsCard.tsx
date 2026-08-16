// Book-to-course pipeline, Phase 7 — the "Quiz me on this chapter" suggested action's inline
// practice widget in the AI Helper chat. Deliberately not wired into QuizSession/AnswerRecord —
// no progress tracking, just a lightweight step-through of the questions
// POST /ai-chat/course/:courseId/practice-questions returned. Handles both MCQ/true-false
// (tappable content.options) and typed-answer questions (content has no options) since the
// shared generator can produce either. See docs/content/book-to-course-design.md.
import { useState } from 'react';
import type { IQuestion } from '@my-backpack/shared';

interface PracticeQuestionsCardProps {
  questions: IQuestion[];
  onDismiss: () => void;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function PracticeQuestionsCard({ questions, onDismiss }: PracticeQuestionsCardProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submittedTyped, setSubmittedTyped] = useState(false);

  const question = questions[index];

  if (!question) {
    return (
      <div className="max-w-md bg-white/50 backdrop-blur rounded-2xl border border-white/60 p-4 flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-800">
          Nice work! That was all {questions.length} practice question{questions.length === 1 ? '' : 's'}.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="self-end text-xs font-semibold text-violet-700 hover:text-violet-800"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const content = question.content;
  const hasOptions = Array.isArray(content.options) && content.options.length > 0;
  const answered = hasOptions ? selected !== null : submittedTyped;
  const isCorrect = hasOptions
    ? selected === content.correctAnswer
    : normalize(typedAnswer) === normalize(content.correctAnswer ?? '');

  const handleNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setTypedAnswer('');
    setSubmittedTyped(false);
  };

  return (
    <div className="max-w-md bg-white/50 backdrop-blur rounded-2xl border border-white/60 p-4 flex flex-col gap-3">
      <p className="text-xs text-gray-400">
        Practice question {index + 1} of {questions.length}
      </p>
      <p className="text-sm font-semibold text-gray-800">{content.prompt}</p>

      {hasOptions ? (
        <div className="flex flex-col gap-1.5">
          {(content.options ?? []).map((option) => {
            const isSelected = selected === option;
            const isThisCorrect = option === content.correctAnswer;
            return (
              <button
                key={option}
                type="button"
                onClick={() => !answered && setSelected(option)}
                disabled={answered}
                className={`text-left text-sm px-3 py-2 rounded-xl border transition-colors ${
                  answered && isThisCorrect
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : answered && isSelected
                      ? 'bg-rose-100 border-rose-300 text-rose-800'
                      : 'bg-white/60 border-white/60 text-gray-700 hover:bg-white/80'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            disabled={submittedTyped}
            placeholder="Type your answer…"
            className="flex-1 text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-1.5 disabled:opacity-60"
          />
          {!submittedTyped && (
            <button
              type="button"
              onClick={() => typedAnswer.trim() && setSubmittedTyped(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
            >
              Submit
            </button>
          )}
        </div>
      )}

      {answered && (
        <div className="text-xs text-gray-600 bg-white/40 rounded-xl p-2">
          <p className="font-semibold">
            {isCorrect ? '✅ Correct!' : `❌ Not quite — the answer is "${content.correctAnswer}".`}
          </p>
          {content.explanation && <p className="mt-1">{content.explanation}</p>}
        </div>
      )}

      {answered && (
        <button
          type="button"
          onClick={handleNext}
          className="self-end text-xs font-semibold text-violet-700 hover:text-violet-800"
        >
          {index + 1 < questions.length ? 'Next question →' : 'Finish'}
        </button>
      )}
    </div>
  );
}
