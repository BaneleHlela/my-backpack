// Adult-style roadmap node: horizontal card in a vertical list.
import { motion } from 'framer-motion';
import { Lock, Star, ChevronRight } from 'lucide-react';
import type { NodeStatus } from '@my-backpack/shared';

interface RoadmapNodeCardProps {
  title: string;
  description?: string;
  status: NodeStatus;
  stars: number;
  lessonCount: number;
  completedLessons: number;
  position: number;
  onClick: () => void;
}

const STATUS_BADGE: Record<NodeStatus, { label: string; classes: string }> = {
  locked: { label: 'Locked', classes: 'bg-gray-100/80 text-gray-500' },
  unlocked: { label: 'Start', classes: 'bg-violet-100/80 text-violet-700' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100/80 text-blue-700' },
  completed: { label: 'Done', classes: 'bg-emerald-100/80 text-emerald-700' },
};

export default function RoadmapNodeCard({
  title,
  description,
  status,
  stars,
  lessonCount,
  completedLessons,
  position,
  onClick,
}: RoadmapNodeCardProps) {
  const isLocked = status === 'locked';
  const badge = STATUS_BADGE[status];
  const pct = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;

  return (
    <motion.button
      type="button"
      onClick={isLocked ? undefined : onClick}
      whileHover={isLocked ? {} : { x: 4 }}
      whileTap={isLocked ? {} : { scale: 0.99 }}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
        isLocked
          ? 'opacity-60 cursor-not-allowed bg-white/20 border-white/30'
          : 'bg-white/30 border-white/40 hover:bg-white/50 cursor-pointer'
      }`}
    >
      {/* Position + lock */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
          status === 'completed'
            ? 'bg-emerald-400 text-white'
            : status === 'in_progress'
            ? 'bg-violet-400 text-white'
            : isLocked
            ? 'bg-gray-200 text-gray-400'
            : 'bg-violet-100 text-violet-700'
        }`}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : position}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 text-sm truncate">{title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
            {badge.label}
          </span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-500">
            {completedLessons}/{lessonCount} lessons
          </span>
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
          {status === 'in_progress' && (
            <div className="flex-1 max-w-[100px] h-1.5 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-400 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {!isLocked && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
    </motion.button>
  );
}
