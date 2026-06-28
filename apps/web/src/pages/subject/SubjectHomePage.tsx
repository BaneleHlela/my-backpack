// Subject home: progress header + standalone topics panel + roadmap.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronLeft, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchRoadmapBySubject,
  fetchSubjectTopics,
} from '../../features/roadmap/roadmapSlice';
import { markSubjectAccessed } from '../../features/enrollment/enrollmentSlice';
import RoadmapPath from '../../components/roadmap/RoadmapPath';
import type { AgeGroup } from '@my-backpack/shared';

export default function SubjectHomePage() {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);

  const { enrolledSubjects } = useSelector((state: RootState) => state.enrollment);
  const { currentRoadmap, standaloneTopics, isLoading, error } = useSelector(
    (state: RootState) => state.roadmap
  );
  const { activeProfile } = useSelector((state: RootState) => state.auth);

  // Find the enrolled subject entry by slug
  let subjectId = '';
  let fieldSlug = '';
  let subjectName = '';
  let fieldName = '';

  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      const found = subjects.find((s) => s.subject.slug === subjectSlug);
      if (found) {
        subjectId = found.subject._id;
        fieldSlug = field.slug;
        subjectName = found.subject.name;
        fieldName = field.name;
        break;
      }
    }
  }

  useEffect(() => {
    if (!subjectId) return;
    void dispatch(fetchRoadmapBySubject(subjectId));
    void dispatch(markSubjectAccessed(subjectId));
    if (fieldSlug && subjectSlug) {
      void dispatch(fetchSubjectTopics({ fieldSlug, subjectSlug }));
    }
  }, [dispatch, subjectId, fieldSlug, subjectSlug]);

  const ageGroup: AgeGroup = activeProfile?.ageGroup ?? 'adult';

  const pct = currentRoadmap
    ? Math.round((currentRoadmap.completedLessons / (currentRoadmap.totalLessons || 1)) * 100)
    : 0;

  if (!subjectId && enrolledSubjects) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-600">Subject not found.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-violet-600 hover:underline text-sm"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Subject header */}
      <div className="bg-white/20 backdrop-blur border-b border-white/30 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {fieldName || 'Dashboard'}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{subjectName}</h1>
        {currentRoadmap && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-1.5">
              {currentRoadmap.completedLessons} of {currentRoadmap.totalLessons} lessons complete
              {' · '}
              <span className="font-semibold">{pct}% done</span>
            </p>
            <div className="h-1.5 bg-white/40 rounded-full overflow-hidden max-w-md">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-400 to-teal-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative flex flex-1">
        {/* Standalone topics panel */}
        <div className="relative flex-shrink-0">
          {/* Collapsed pill */}
          <AnimatePresence>
            {!panelOpen && standaloneTopics.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={() => setPanelOpen(true)}
                className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 py-4 px-2 bg-white/40 backdrop-blur border border-white/50 rounded-r-2xl shadow-md hover:bg-white/60 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-gray-600" />
                <span
                  className="text-xs text-gray-600 font-medium"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  Topics
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Expanded panel */}
          <AnimatePresence>
            {panelOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black z-20"
                  onClick={() => setPanelOpen(false)}
                />
                <motion.div
                  initial={{ x: -240 }}
                  animate={{ x: 0 }}
                  exit={{ x: -240 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="fixed left-0 top-[60px] bottom-0 w-60 z-30 bg-white/80 backdrop-blur-xl border-r border-white/50 shadow-xl overflow-y-auto p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">Topics</h3>
                    <button
                      type="button"
                      onClick={() => setPanelOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    {standaloneTopics.map(({ topic, miniApps }) => (
                      <div key={topic._id}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          {topic.name}
                        </p>
                        <div className="space-y-1">
                          {miniApps.map((app) => (
                            <button
                              key={app._id}
                              type="button"
                              onClick={() => {
                                setPanelOpen(false);
                                navigate(
                                  `/field/${fieldSlug}/subject/${subjectSlug}/topic/${topic.slug}/miniapp/${app.slug}`
                                );
                              }}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/60 transition-colors"
                            >
                              <span className="text-base">
                                {app.type === 'dictionary' ? '📖' : app.type === 'quiz' ? '🧠' : app.type === 'flashcards' ? '🃏' : '▶'}
                              </span>
                              <span className="text-sm text-gray-700">{app.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Roadmap main content */}
        <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
          {isLoading && !currentRoadmap && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-gray-500">
              <p>Could not load roadmap.</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && currentRoadmap && currentRoadmap.nodes.length === 0 && (
            <p className="text-center text-gray-500 py-16">No lessons available yet.</p>
          )}

          {currentRoadmap && currentRoadmap.nodes.length > 0 && (
            <RoadmapPath
              roadmap={currentRoadmap}
              ageGroup={ageGroup}
              subjectSlug={subjectSlug ?? ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}
