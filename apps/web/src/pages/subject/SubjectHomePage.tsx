// Subject home: course grid (main content) + subject-level mini-apps panel (side).
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Blocks, ChevronLeft, Loader2, Map } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchSubjectBySlug, fetchMiniAppsBySubject } from '../../features/subjects/subjectsSlice';
import { fetchCoursesBySubject } from '../../features/courses/coursesSlice';
import { markSubjectAccessed } from '../../features/enrollment/enrollmentSlice';

const MINI_APP_EMOJI: Record<string, string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
};

export default function SubjectHomePage() {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);

  const { enrolledSubjects } = useSelector((state: RootState) => state.enrollment);
  const { subjectsByKey, miniAppsByKey } = useSelector((state: RootState) => state.subjects);
  const { coursesByKey, isLoading, error } = useSelector((state: RootState) => state.courses);

  // The /subject/:subjectSlug route carries no :fieldSlug segment, so fieldSlug/subjectId
  // still have to be resolved via the enrolled-subjects list — only used to key the
  // subject/courses/miniapps fetches below, not for display.
  let subjectId = '';
  let fieldSlug = '';
  let fieldName = '';

  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      const found = subjects.find((s) => s.subject.slug === subjectSlug);
      if (found) {
        subjectId = found.subject._id;
        fieldSlug = field.slug;
        fieldName = field.name;
        break;
      }
    }
  }

  const subjectKey = fieldSlug && subjectSlug ? `${fieldSlug}/${subjectSlug}` : '';
  const subjectName = subjectKey ? (subjectsByKey[subjectKey]?.name ?? '') : '';
  const courses = subjectKey ? (coursesByKey[subjectKey] ?? []) : [];
  const subjectMiniApps = subjectKey ? (miniAppsByKey[subjectKey] ?? []) : [];

  useEffect(() => {
    if (!subjectId) return;
    void dispatch(markSubjectAccessed(subjectId));
    if (fieldSlug && subjectSlug) {
      void dispatch(fetchSubjectBySlug({ fieldSlug, subjectSlug }));
      void dispatch(fetchCoursesBySubject({ fieldSlug, subjectSlug }));
      void dispatch(fetchMiniAppsBySubject({ fieldSlug, subjectSlug }));
    }
  }, [dispatch, subjectId, fieldSlug, subjectSlug]);

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
      </div>

      {/* Body */}
      <div className="relative flex flex-1">
        {/* Mini-apps panel */}
        <div className="relative flex-shrink-0">
          {/* Collapsed pill */}
          <AnimatePresence>
            {!panelOpen && subjectMiniApps.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={() => setPanelOpen(true)}
                className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 py-4 px-2 bg-white/40 backdrop-blur border border-white/50 rounded-r-2xl shadow-md hover:bg-white/60 transition-colors"
              >
                <Blocks className="w-4 h-4 text-gray-600" />
                <span
                  className="text-xs text-gray-600 font-medium"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  Mini-Apps
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
                    <h3 className="font-bold text-gray-800 text-sm">Mini-Apps</h3>
                    <button
                      type="button"
                      onClick={() => setPanelOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1">
                    {subjectMiniApps.map((app) => (
                      <button
                        key={app._id}
                        type="button"
                        onClick={() => {
                          setPanelOpen(false);
                          navigate(`/field/${fieldSlug}/subject/${subjectSlug}/miniapp/${app.slug}`);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/60 transition-colors"
                      >
                        <span className="text-base">{MINI_APP_EMOJI[app.type] ?? '📦'}</span>
                        <span className="text-sm text-gray-700">{app.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Course grid */}
        <div className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
          {isLoading && courses.length === 0 && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-gray-500">
              <p>Could not load courses.</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && courses.length === 0 && (
            <p className="text-center text-gray-500 py-16">No courses available yet.</p>
          )}

          {courses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course, i) => (
                <motion.button
                  key={course._id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/subject/${subjectSlug}/course/${course.slug}`)}
                  className="w-full text-left bg-white/30 backdrop-blur-sm rounded-3xl border border-white/40 p-6 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">
                      {course.iconUrl ? (
                        <img src={course.iconUrl} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <Map className="w-8 h-8 text-violet-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-800 leading-tight truncate">
                        {course.name}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="inline-block w-fit text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100/80 text-violet-700">
                    {course.roadmap.nodeCount} topic{course.roadmap.nodeCount === 1 ? '' : 's'}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
