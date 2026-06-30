// "Question N of M" label plus a visual progress bar.
import { motion } from 'framer-motion';

interface QuizProgressProps {
  answered: number;
  total: number;
}

export default function QuizProgress({ answered, total }: QuizProgressProps) {
  const current = Math.min(answered + 1, total || 1);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-500 mb-1.5">
        Question {current} of {total}
      </p>
      <div className="h-1.5 bg-white/40 rounded-full overflow-hidden">
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
