// /studio/courses — grid of every course across every subject. There's no "all courses"
// backend endpoint, so this aggregates client-side from the existing public content
// endpoints (fields -> subjects -> courses per subject), cached in studioSlice.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, BookOpen } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchAllCourses } from '../../features/studio/studioSlice';
import CreateCourseModal from '../../features/studio/components/CreateCourseModal';

export default function CoursesListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { allCourses, allCoursesLoaded, isLoading, error } = useSelector(
    (state: RootState) => state.studio
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (!allCoursesLoaded) void dispatch(fetchAllCourses());
  }, [dispatch, allCoursesLoaded]);

  const grouped = allCourses.reduce<Record<string, { label: string; courses: typeof allCourses }>>(
    (acc, course) => {
      const key = `${course.fieldName} / ${course.subjectName}`;
      if (!acc[key]) acc[key] = { label: key, courses: [] };
      acc[key].courses.push(course);
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every course across every subject</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>

      {isLoading && allCourses.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {!isLoading && allCoursesLoaded && allCourses.length === 0 && (
        <p className="text-gray-500 text-center py-16">No courses yet. Create the first one.</p>
      )}

      <div className="flex flex-col gap-8">
        {Object.values(grouped).map(({ label, courses }) => (
          <div key={label}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              {label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map((course) => (
                <button
                  key={course._id}
                  type="button"
                  onClick={() => navigate(`/studio/courses/${course._id}`)}
                  className="text-left bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-4 hover:shadow-md hover:bg-white/40 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{course.name}</p>
                      {course.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {course.nodeCount} topic{course.nodeCount === 1 ? '' : 's'}
                        {!course.isActive && ' · inactive'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isCreateOpen && (
        <CreateCourseModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={(courseId) => {
            setIsCreateOpen(false);
            navigate(`/studio/courses/${courseId}`);
          }}
        />
      )}
    </div>
  );
}
