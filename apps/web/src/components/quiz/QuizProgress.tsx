// "Question N of M" label plus a visual progress bar.
import { motion } from 'framer-motion';
import type { AgeGroup } from '@my-backpack/shared';

interface QuizProgressProps {
  answered: number;
  total: number;
  ageGroup?: AgeGroup;
}

export default function QuizProgress({ answered, total, ageGroup }: QuizProgressProps) {
  const isChild = ageGroup === 'child';
  const current = Math.min(answered + 1, total || 1);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="flex-shrink-0 mb-4">
      <p className={`text-gray-500 mb-1.5 ${isChild ? 'text-base font-medium' : 'text-sm'}`}>
        Question {current} of {total}
      </p>
      <div className={`bg-white/40 rounded-full overflow-hidden ${isChild ? 'h-3' : 'h-1.5'}`}>
        <motion.div
          className="h-full bg-gradient-to-r from-violet-400 to-teal-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
