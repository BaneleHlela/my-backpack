// Child-style roadmap node: large circle on a winding path.
import { motion } from 'framer-motion';
import { Lock, Star } from 'lucide-react';
import type { NodeStatus } from '@my-backpack/shared';

interface RoadmapNodeCircleProps {
  title: string;
  status: NodeStatus;
  stars: number;
  onClick: () => void;
}

const STATUS_STYLE: Record<NodeStatus, string> = {
  locked: 'bg-gray-300 text-gray-400',
  unlocked: 'bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-lg shadow-violet-300/50',
  in_progress: 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-indigo-300/60',
  completed: 'bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-lg shadow-emerald-300/50',
};

export default function RoadmapNodeCircle({
  title,
  status,
  stars,
  onClick,
}: RoadmapNodeCircleProps) {
  const isLocked = status === 'locked';

  return (
    <div className="flex flex-col items-center gap-2 w-[80px]">
      <motion.button
        type="button"
        onClick={isLocked ? undefined : onClick}
        whileHover={isLocked ? {} : { scale: 1.08 }}
        whileTap={isLocked ? {} : { scale: 0.94 }}
        animate={
          status === 'unlocked'
            ? { boxShadow: ['0 0 0 0 rgba(139,92,246,0.4)', '0 0 0 12px rgba(139,92,246,0)', '0 0 0 0 rgba(139,92,246,0)'] }
            : {}
        }
        transition={status === 'unlocked' ? { duration: 2, repeat: Infinity } : {}}
        className={`w-[80px] h-[80px] rounded-full flex items-center justify-center ${STATUS_STYLE[status]} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isLocked ? (
          <Lock className="w-7 h-7" />
        ) : status === 'completed' ? (
          <Star className="w-7 h-7 fill-current" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-white/30" />
        )}
      </motion.button>

      {/* Stars */}
      {status === 'completed' && (
        <div className="flex gap-0.5">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`w-3 h-3 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2 w-[80px]">
        {title}
      </p>
    </div>
  );
}
