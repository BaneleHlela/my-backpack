// Shown as a modal immediately after each answer. Tone branches by ageGroup per the
// brand guide (celebratory/simple for child, confident/direct for adult) — English
// vocab skews adult, so that's the default. No backdrop-click-to-dismiss — advancing
// is the only way out, via the button, so the learner can't skip past the result.
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, SkipForward, Volume2 } from 'lucide-react';
import { ASSETS } from '@my-backpack/shared';
import type { AgeGroup, IQuestionContent } from '@my-backpack/shared';
import SpokenText from './SpokenText';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  content: IQuestionContent;
  ageGroup: AgeGroup;
  lang: string;
  isLastQuestion: boolean;
  wasSkipped?: boolean;
  onAdvance: () => void;
}

function resolveAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${ASSETS.GCS_BASE}/${path}`;
}

function playAudio(path?: string) {
  const url = resolveAssetUrl(path);
  if (url) void new Audio(url).play();
}

export default function AnswerFeedback({
  isCorrect,
  pointsAwarded,
  maxPoints,
  content,
  ageGroup,
  lang,
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
              <img src={avatarUrl} alt="" className={isChild ? 'w-20 h-20 object-contain' : 'w-16 h-16 object-contain'} />
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
                className={`font-semibold ${isChild ? 'text-xl' : 'text-lg'} ${
                  wasSkipped ? 'text-gray-600' : isCorrect ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {headline}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {pointsAwarded} / {maxPoints} points
              </p>

              {!wasSkipped && feedback?.text && (
                feedback.audioUrl ? (
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-sm text-gray-700">{feedback.text}</p>
                    <button
                      type="button"
                      onClick={() => playAudio(feedback.audioUrl)}
                      aria-label="Play audio"
                      className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/40 border border-white/50 hover:bg-white/60 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <SpokenText text={feedback.text} lang={lang} className="text-sm text-gray-700 mt-3" />
                )
              )}

              {!isCorrect && content.correctAnswer && (
                <p className="text-sm text-gray-700 mt-3">
                  Correct answer: <span className="font-semibold">{content.correctAnswer}</span>
                </p>
              )}

              {!wasSkipped && content.explanation && (
                <SpokenText text={content.explanation} lang={lang} className="text-sm text-gray-600 mt-2" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onAdvance}
            className={`w-full mt-5 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 transition-colors ${
              isChild ? 'py-4 text-lg' : 'py-3'
            }`}
          >
            {isLastQuestion ? 'Finish' : 'Next question'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
