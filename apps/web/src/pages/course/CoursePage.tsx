// Course page: progress header + roadmap for one Course, plus a quick-links row to any
// MiniApps the course links (e.g. Dictionary inside an English course).
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchCourseBySlug,
  fetchRoadmapByCourse,
} from '../../features/roadmap/roadmapSlice';
import RoadmapPath from '../../components/roadmap/RoadmapPath';
import type { AgeGroup, IMiniApp } from '@my-backpack/shared';

const MINI_APP_EMOJI: Record<string, string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
};

type LinkedMiniApp = Pick<IMiniApp, '_id' | 'name' | 'slug' | 'type' | 'description'>;

export default function CoursePage() {
  const { subjectSlug, courseSlug } = useParams<{ subjectSlug: string; courseSlug: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { enrolledSubjects } = useSelector((state: RootState) => state.enrollment);
  const { courses, currentCourse, currentRoadmap, isLoading, error } = useSelector(
    (state: RootState) => state.roadmap
  );
  const { activeProfile } = useSelector((state: RootState) => state.auth);

  let fieldSlug = '';
  let subjectName = '';

  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      const found = subjects.find((s) => s.subject.slug === subjectSlug);
      if (found) {
        fieldSlug = field.slug;
        subjectName = found.subject.name;
        break;
      }
    }
  }

  const listCourse = courses.find((c) => c.slug === courseSlug);
  const course = listCourse ?? (currentCourse?.slug === courseSlug ? currentCourse : undefined);

  // Fall back to a direct course-detail fetch when the courses list isn't in state yet
  // (e.g. a direct link or a page refresh landing straight on the course page).
  useEffect(() => {
    if (!fieldSlug || !subjectSlug || !courseSlug || listCourse) return;
    void dispatch(fetchCourseBySlug({ fieldSlug, subjectSlug, courseSlug }));
  }, [dispatch, fieldSlug, subjectSlug, courseSlug, listCourse]);

  useEffect(() => {
    if (course?._id) {
      void dispatch(fetchRoadmapByCourse(course._id));
    }
  }, [dispatch, course?._id]);

  const ageGroup: AgeGroup = activeProfile?.ageGroup ?? 'adult';

  const pct = currentRoadmap
    ? Math.round((currentRoadmap.completedItems / (currentRoadmap.totalItems || 1)) * 100)
    : 0;

  const linkedMiniApps: LinkedMiniApp[] =
    course && course.miniAppIds.length > 0 && typeof course.miniAppIds[0] !== 'string'
      ? (course.miniAppIds as LinkedMiniApp[])
      : [];

  return (
    <div className="flex flex-col">
      {/* Course header */}
      <div className="bg-white/20 backdrop-blur border-b border-white/30 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(`/subject/${subjectSlug}`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {subjectName || 'Back'}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{course?.name ?? courseSlug}</h1>
        {course?.description && <p className="text-sm text-gray-600 mt-1">{course.description}</p>}

        {currentRoadmap && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-1.5">
              {currentRoadmap.completedItems} of {currentRoadmap.totalItems} items complete
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

        {linkedMiniApps.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {linkedMiniApps.map((app) => (
              <button
                key={app._id}
                type="button"
                onClick={() => navigate(`/field/${fieldSlug}/subject/${subjectSlug}/miniapp/${app.slug}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-colors text-sm text-gray-700"
              >
                <span>{MINI_APP_EMOJI[app.type] ?? '📦'}</span>
                {app.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Roadmap */}
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
            courseSlug={courseSlug ?? ''}
          />
        )}
      </div>
    </div>
  );
}
