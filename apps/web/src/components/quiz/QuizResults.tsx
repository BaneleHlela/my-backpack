// Final results screen shown after a session completes.
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, BookOpen } from 'lucide-react';
import type { SessionResults } from '@my-backpack/shared';

interface QuizResultsProps {
  results: SessionResults;
  onQuizAgain: () => void;
  onReturnToDictionary: () => void;
}

export default function QuizResults({ results, onQuizAgain, onReturnToDictionary }: QuizResultsProps) {
  const seconds = Math.round(results.timeTakenMs / 1000);
  const timeLabel = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-8 text-center"
    >
      <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
      <h2 className="text-2xl font-bold text-gray-800 mt-3">{results.percentageScore}% score</h2>
      <p className="text-gray-500 mt-1">
        {results.correct} of {results.totalQuestions} correct
      </p>

      <div className="grid grid-cols-3 gap-3 mt-6 text-left">
        <div className="bg-white/40 rounded-2xl p-3">
          <p className="text-xs text-gray-500">Answered</p>
          <p className="font-semibold text-gray-800">
            {results.answered}/{results.totalQuestions}
          </p>
        </div>
        <div className="bg-white/40 rounded-2xl p-3">
          <p className="text-xs text-gray-500">Points</p>
          <p className="font-semibold text-gray-800">
            {results.totalPointsAwarded}/{results.totalPointsAvailable}
          </p>
        </div>
        <div className="bg-white/40 rounded-2xl p-3">
          <p className="text-xs text-gray-500">Time</p>
          <p className="font-semibold text-gray-800">{timeLabel}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onReturnToDictionary}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Return to dictionary
        </button>
        <button
          type="button"
          onClick={onQuizAgain}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Quiz again
        </button>
      </div>
    </motion.div>
  );
}
