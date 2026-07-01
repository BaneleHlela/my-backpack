// Card showing a single enrolled subject with progress and last-accessed info.
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import type { AppDispatch } from '../../app/store';
import { markSubjectAccessed } from '../../features/enrollment/enrollmentSlice';
import type { IProfileSubjectEnrollment } from '@my-backpack/shared';

interface SubjectCardProps {
  enrollment: IProfileSubjectEnrollment;
  subject: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    iconUrl?: string;
  };
}

export default function SubjectCard({ enrollment, subject }: SubjectCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { progressSummary, status, lastAccessedAt } = enrollment;

  const pct = Math.round(progressSummary.overallProgressPercent ?? 0);

  const lastStudied = lastAccessedAt
    ? formatDistanceToNow(new Date(lastAccessedAt), { addSuffix: true })
    : null;

  const handleClick = () => {
    void dispatch(markSubjectAccessed(subject._id));
    navigate(`/subject/${subject.slug}`);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="w-full text-left bg-white/30 backdrop-blur-sm rounded-3xl border border-white/40 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">
          {subject.iconUrl ? (
            <img src={subject.iconUrl} alt="" className="w-10 h-10 object-contain" />
          ) : (
            '📚'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-800 leading-tight truncate">
            {subject.name}
          </h3>
          <span
            className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              status === 'active'
                ? 'bg-green-100/80 text-green-700'
                : status === 'paused'
                ? 'bg-yellow-100/80 text-yellow-700'
                : 'bg-blue-100/80 text-blue-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1.5">
          <span>
            {progressSummary.completedItems} of {progressSummary.totalItems} items complete
          </span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Last studied */}
      {lastStudied && (
        <p className="text-xs text-gray-500">Last studied {lastStudied}</p>
      )}
    </motion.button>
  );
}
