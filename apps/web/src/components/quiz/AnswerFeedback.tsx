// Shown as a modal immediately after each answer. Tone branches by ageGroup per the
// brand guide (celebratory/simple for child, confident/direct for adult) — English
// vocab skews adult, so that's the default. No backdrop-click-to-dismiss — advancing
// is the only way out, via the button, so the learner can't skip past the result.
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, SkipForward } from 'lucide-react';
import { ASSETS } from '@my-backpack/shared';
import type { AgeGroup, IQuestionContent } from '@my-backpack/shared';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  content: IQuestionContent;
  ageGroup: AgeGroup;
  isLastQuestion: boolean;
  wasSkipped?: boolean;
  onAdvance: () => void;
}

export default function AnswerFeedback({
  isCorrect,
  pointsAwarded,
  maxPoints,
  content,
  ageGroup,
  isLastQuestion,
  wasSkipped,
  onAdvance,
}: AnswerFeedbackProps) {
  const isChild = ageGroup === 'child';

  const headline = wasSkipped
    ? 'Skipped'
    : isCorrect
    ? isChild
      ? 'Well done! 🎉'
      : 'Correct'
    : isChild
    ? 'Try again next time!'
    : 'Not quite';

  const ring = wasSkipped ? 'border-gray-200' : isCorrect ? 'border-emerald-200' : 'border-rose-200';

  const feedback = isCorrect ? content.successFeedback : content.tryAgainFeedback;
  const avatarUrl =
    !wasSkipped && content.avatar
      ? ASSETS.AVATARS.image(content.avatar.avatarId, feedback?.avatarEmotion ?? content.avatar.emotion)
      : undefined;

  console.log(avatarUrl)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 12 }}
          className={`bg-white/95 backdrop-blur rounded-3xl border shadow-2xl p-6 w-full max-w-md ${ring}`}
        >
          {avatarUrl && (
            <div className="flex justify-center mb-3">
              <img src={avatarUrl} alt="" className="w-16 h-16 object-contain" />
            </div>
          )}

          <div className="flex items-start gap-3">
            {wasSkipped ? (
              <SkipForward className="w-7 h-7 text-gray-400 flex-shrink-0" />
            ) : isCorrect ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-rose-500 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`text-lg font-semibold ${
                  wasSkipped ? 'text-gray-600' : isCorrect ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {headline}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {pointsAwarded} / {maxPoints} points
              </p>

              {!isCorrect && content.correctAnswer && (
                <p className="text-sm text-gray-700 mt-3">
                  Correct answer: <span className="font-semibold">{content.correctAnswer}</span>
                </p>
              )}

              {!wasSkipped && content.explanation && (
                <p className="text-sm text-gray-600 mt-2">{content.explanation}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onAdvance}
            className="w-full mt-5 py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 transition-colors"
          >
            {isLastQuestion ? 'Finish' : 'Next question'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
