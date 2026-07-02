// Lesson resource-hub page. A lesson is always pure study material now — no more
// lessonType/practice/assessment branching (those are separate quiz items, played on
// QuizItemPlayerPage instead). Renders resources[] sorted by position, one block per type.
// Marking complete auto-advances straight to the next item (lesson or quiz) after a brief
// pause, falling back to the roadmap overview when there's no next item in the node.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import axiosInstance from '../../lib/axios';
import { fetchLesson } from '../../features/roadmap/roadmapSlice';
import type { AppDispatch, RootState } from '../../app/store';
import type { ItemCompletionResult } from '@my-backpack/shared';
import SteppedNotesViewer from '../../components/lesson/SteppedNotesViewer';

const AUTO_ADVANCE_DELAY_MS = 1500;

export default function LessonPlayerPage() {
  const { subjectSlug, lessonId } = useParams<{ subjectSlug: string; lessonId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentLesson, isLoading } = useSelector((state: RootState) => state.roadmap);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  const [nextItem, setNextItem] = useState<ItemCompletionResult | null>(null);

  useEffect(() => {
    if (lessonId) void dispatch(fetchLesson(lessonId));
  }, [dispatch, lessonId]);

  const handleMarkComplete = async () => {
    if (!lessonId || !currentLesson) return;
    setCompleting(true);
    try {
      const res = await axiosInstance.post(`/roadmap/lesson/${lessonId}/study`);
      const result = res.data.data as ItemCompletionResult;
      setDone(true);
      setNextItem(result);
      setTimeout(() => {
        if (result.nextItemId && result.nextItemType === 'lesson') {
          navigate(`/subject/${subjectSlug}/lesson/${result.nextItemId}`);
        } else if (result.nextItemId && result.nextItemType === 'quiz') {
          navigate(`/subject/${subjectSlug}/node/${currentLesson.nodeId}/quiz/${result.nextItemId}`);
        } else {
          navigate(`/subject/${subjectSlug}`);
        }
      }, AUTO_ADVANCE_DELAY_MS);
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

  const sortedResources = [...currentLesson.resources].sort((a, b) => a.position - b.position);

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
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          Study
        </span>
        <h1 className="text-xl font-bold text-gray-800 mt-2">{currentLesson.title}</h1>
      </motion.div>

      {/* Resources */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-6 mb-6 space-y-6"
      >
        {sortedResources.length === 0 && (
          <p className="text-gray-500 text-sm">No study material available for this lesson.</p>
        )}

        {sortedResources.map((resource, i) => {
          switch (resource.type) {
            case 'video':
              return (
                <video key={i} controls className="w-full rounded-xl">
                  <source src={resource.url} />
                </video>
              );
            case 'pdf':
              return (
                <div key={i} className="space-y-2">
                  <iframe src={resource.url} title={resource.title ?? 'PDF'} className="w-full h-[500px] rounded-xl border border-white/40" />
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-violet-600 hover:text-violet-800 underline"
                  >
                    Open PDF in a new tab
                  </a>
                </div>
              );
            case 'image':
              return (
                <div key={i}>
                  <img src={resource.url} alt={resource.caption ?? ''} className="w-full rounded-xl" />
                  {resource.caption && <p className="text-xs text-gray-500 mt-1">{resource.caption}</p>}
                </div>
              );
            case 'notes':
              return (
                <div key={i} className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{resource.markdown ?? ''}</ReactMarkdown>
                </div>
              );
            case 'audio':
              return (
                <audio key={i} controls className="w-full rounded-xl">
                  <source src={resource.url} />
                </audio>
              );
            case 'steps':
              return <SteppedNotesViewer key={i} steps={resource.steps ?? []} />;
            default:
              return null;
          }
        })}
      </motion.div>

      {/* Complete button */}
      {!done && (
        <button
          type="button"
          onClick={() => void handleMarkComplete()}
          disabled={completing}
          className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as complete'}
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
          <p className="text-xs text-gray-400">
            {nextItem?.nextItemId ? 'Moving to the next item…' : 'Returning to the roadmap…'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
