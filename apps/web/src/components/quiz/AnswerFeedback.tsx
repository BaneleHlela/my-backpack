// Shown immediately after each answer. Tone branches by ageGroup per the brand
// guide (celebratory/simple for child, confident/direct for adult) — English
// vocab skews adult, so that's the default.
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { AgeGroup, IQuestionContent } from '@my-backpack/shared';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  content: IQuestionContent;
  ageGroup: AgeGroup;
  isLastQuestion: boolean;
  onAdvance: () => void;
}

export default function AnswerFeedback({
  isCorrect,
  pointsAwarded,
  maxPoints,
  content,
  ageGroup,
  isLastQuestion,
  onAdvance,
}: AnswerFeedbackProps) {
  const isChild = ageGroup === 'child';

  const headline = isCorrect
    ? isChild
      ? 'Well done! 🎉'
      : 'Correct'
    : isChild
    ? 'Try again next time!'
    : 'Not quite';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${
        isCorrect ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {isCorrect ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className={`font-semibold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
            {headline}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {pointsAwarded} / {maxPoints} points
          </p>

          {!isCorrect && content.correctAnswer && (
            <p className="text-sm text-gray-700 mt-2">
              Correct answer: <span className="font-semibold">{content.correctAnswer}</span>
            </p>
          )}

          {content.explanation && (
            <p className="text-sm text-gray-600 mt-2">{content.explanation}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdvance}
        className="w-full mt-4 py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 transition-colors"
      >
        {isLastQuestion ? 'Finish' : 'Next question'}
      </button>
    </motion.div>
  );
}
