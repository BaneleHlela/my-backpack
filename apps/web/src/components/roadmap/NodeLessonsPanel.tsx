// Slide-in panel (bottom sheet on mobile, side panel on desktop) showing lessons for a node.
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Play, CheckCircle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import type {
  LessonType,
  LessonStatus,
  NodeStatus,
  ILessonStudyMaterial,
} from '@my-backpack/shared';

// Local enriched types derived from RoadmapWithProgress
interface LessonWithProgress {
  _id: string;
  title: string;
  lessonType: LessonType;
  studyMaterial?: ILessonStudyMaterial;
  quizId?: string;
  passingScore: number;
  isActive: boolean;
  progressStatus: LessonStatus;
  isUnlocked: boolean;
}

export interface NodeForPanel {
  _id: string;
  title: string;
  description?: string;
  stars: number;
  isUnlocked: boolean;
  progressStatus: NodeStatus;
  lessons: LessonWithProgress[];
}

interface NodeLessonsPanelProps {
  node: NodeForPanel;
  subjectSlug: string;
  onClose: () => void;
}

const LESSON_TYPE_META: Record<LessonType, { label: string; classes: string }> = {
  introduction: { label: 'Study', classes: 'bg-blue-100/80 text-blue-700' },
  practice: { label: 'Practice', classes: 'bg-green-100/80 text-green-700' },
  assessment: { label: 'Challenge', classes: 'bg-orange-100/80 text-orange-700' },
};

export default function NodeLessonsPanel({ node, subjectSlug, onClose }: NodeLessonsPanelProps) {
  const navigate = useNavigate();
  const { activeProfile } = useSelector((state: RootState) => state.auth);
  void activeProfile;

  const handleLessonClick = (lesson: LessonWithProgress) => {
    if (!lesson.isUnlocked) return;
    navigate(`/subject/${subjectSlug}/lesson/${lesson._id}`);
    onClose();
  };

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{node.title}</h3>
          {node.description && (
            <p className="text-sm text-gray-500 mt-1">{node.description}</p>
          )}
          {node.stars > 0 && (
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= node.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/60 transition-colors text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drag handle for mobile */}
      <div className="md:hidden flex justify-center pb-2 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Lessons list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
        {node.lessons.map((lesson, i) => {
          const meta = LESSON_TYPE_META[lesson.lessonType];
          const isLocked = !lesson.isUnlocked;
          const isDone = lesson.progressStatus === 'completed';
          const isActive =
            lesson.progressStatus === 'unlocked' || lesson.progressStatus === 'in_progress';

          return (
            <button
              key={lesson._id}
              type="button"
              onClick={() => handleLessonClick(lesson)}
              disabled={isLocked}
              className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                isLocked
                  ? 'opacity-50 cursor-not-allowed bg-white/20 border-white/30'
                  : 'bg-white/40 border-white/50 hover:bg-white/60 cursor-pointer'
              }`}
            >
              {/* Number / status icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  isDone
                    ? 'bg-emerald-400 text-white'
                    : isActive
                    ? 'bg-violet-400 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  i + 1
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{lesson.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${meta.classes}`}>
                    {meta.label}
                  </span>
                  {lesson.quizId && (
                    <span className="text-xs text-gray-400">Has questions</span>
                  )}
                </div>
              </div>

              {/* Play icon */}
              {!isLocked && !isDone && (
                <Play
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-violet-500 fill-violet-500' : 'text-gray-400'
                  }`}
                />
              )}
            </button>
          );
        })}

        {node.lessons.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">No lessons yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />

        {/* Mobile — bottom sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl rounded-t-3xl border border-white/50 shadow-2xl max-h-[70vh] flex flex-col md:hidden"
        >
          {panelContent}
        </motion.div>

        {/* Desktop — right side panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-[60px] bottom-0 right-0 z-50 w-[360px] bg-white/80 backdrop-blur-xl border-l border-white/50 shadow-2xl hidden md:flex flex-col"
        >
          {panelContent}
        </motion.div>
      </>
    </AnimatePresence>
  );
}
