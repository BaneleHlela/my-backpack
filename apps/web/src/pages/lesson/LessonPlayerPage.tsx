// Scaffold for the lesson player. Introduction lessons show study material + complete button.
// Practice and assessment lessons show a placeholder until the quiz UI is built.
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import axiosInstance from '../../lib/axios';
import { fetchLesson } from '../../features/roadmap/roadmapSlice';
import type { AppDispatch, RootState } from '../../app/store';
import { useState } from 'react';

const LESSON_TYPE_META = {
  introduction: { label: 'Study', classes: 'bg-blue-100 text-blue-700' },
  practice: { label: 'Practice', classes: 'bg-green-100 text-green-700' },
  assessment: { label: 'Challenge', classes: 'bg-orange-100 text-orange-700' },
};

export default function LessonPlayerPage() {
  const { subjectSlug, lessonId } = useParams<{ subjectSlug: string; lessonId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentLesson, isLoading } = useSelector((state: RootState) => state.roadmap);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lessonId) void dispatch(fetchLesson(lessonId));
  }, [dispatch, lessonId]);

  const handleMarkComplete = async () => {
    if (!lessonId) return;
    setCompleting(true);
    try {
      await axiosInstance.post(`/roadmap/lesson/${lessonId}/study`);
      setDone(true);
      setTimeout(() => navigate(`/subject/${subjectSlug}`), 1500);
    } catch {
      // ignore — let user retry
    } finally {
      setCompleting(false);
    }
  };

  if (isLoading || !currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const meta = LESSON_TYPE_META[currentLesson.lessonType];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(`/subject/${subjectSlug}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to roadmap
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-6 mb-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.classes}`}>
              {meta.label}
            </span>
            <h1 className="text-xl font-bold text-gray-800 mt-2">{currentLesson.title}</h1>
          </div>
        </div>
      </motion.div>

      {/* Introduction: show study material */}
      {currentLesson.lessonType === 'introduction' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-6 mb-6"
        >
          {currentLesson.studyMaterial?.notes ? (
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{currentLesson.studyMaterial.notes}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No study material available for this lesson.</p>
          )}

          {currentLesson.studyMaterial?.audioUrl && (
            <audio controls className="mt-4 w-full rounded-xl">
              <source src={currentLesson.studyMaterial.audioUrl} />
            </audio>
          )}
        </motion.div>
      )}

      {/* Practice / Assessment: placeholder */}
      {(currentLesson.lessonType === 'practice' || currentLesson.lessonType === 'assessment') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-8 mb-6 flex flex-col items-center gap-4 text-center"
        >
          <span className="text-5xl">🧠</span>
          <p className="font-semibold text-gray-700">Quiz coming soon</p>
          <p className="text-sm text-gray-500">This lesson has {currentLesson.questionIds.length} questions.</p>
          <button
            type="button"
            onClick={() => navigate(`/subject/${subjectSlug}`)}
            className="mt-2 px-5 py-2 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
          >
            Back to roadmap
          </button>
        </motion.div>
      )}

      {/* Complete button for introduction lessons */}
      {currentLesson.lessonType === 'introduction' && !done && (
        <button
          type="button"
          onClick={() => void handleMarkComplete()}
          disabled={completing}
          className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {completing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Mark as complete'
          )}
        </button>
      )}

      {/* Completion animation */}
      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-2 py-4"
        >
          <CheckCircle className="w-10 h-10 text-emerald-500" />
          <p className="font-semibold text-gray-700">Lesson complete!</p>
        </motion.div>
      )}
    </div>
  );
}
