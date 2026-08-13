// Course Chat hub — two destinations: AI Helper (live, built this pass) and Classmates &
// Teacher (visibly present but disabled — no teacher accounts or class/cohort model exist yet,
// see docs/product/course-chat-vision.md). Non-interactive by design: the explanation is
// already shown on the card itself, so no extra click/toast is needed on top of that.
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BotMessageSquare, Users } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchCourseBySlug } from '../../features/courses/coursesSlice';

export default function CourseChatPage() {
  const { subjectSlug, courseSlug } = useParams<{ subjectSlug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { enrolledSubjects } = useSelector((state: RootState) => state.enrollment);
  const { coursesByKey, currentCourse } = useSelector((state: RootState) => state.courses);

  let fieldSlug = '';
  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      if (subjects.some((s) => s.subject.slug === subjectSlug)) {
        fieldSlug = field.slug;
        break;
      }
    }
  }

  const courses =
    fieldSlug && subjectSlug ? (coursesByKey[`${fieldSlug}/${subjectSlug}`] ?? []) : [];
  const listCourse = courses.find((c) => c.slug === courseSlug);
  const course = listCourse ?? (currentCourse?.slug === courseSlug ? currentCourse : undefined);

  // Fall back to a direct course-detail fetch when the courses list isn't in state yet —
  // same convention CoursePage.tsx uses (a direct link or page refresh landing here first).
  useEffect(() => {
    if (!fieldSlug || !subjectSlug || !courseSlug || listCourse) return;
    void dispatch(fetchCourseBySlug({ fieldSlug, subjectSlug, courseSlug }));
  }, [dispatch, fieldSlug, subjectSlug, courseSlug, listCourse]);

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(`/subject/${subjectSlug}/course/${courseSlug}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {course?.name ?? 'Back to course'}
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">Course Chat</h1>
      <p className="text-sm text-gray-600 mb-6">Get help with {course?.name ?? 'this course'}.</p>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate(`/subject/${subjectSlug}/course/${courseSlug}/chat/ai-helper`)}
          disabled={!course}
          className="flex items-center gap-4 text-left bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-5 hover:bg-white/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center flex-shrink-0">
            <BotMessageSquare className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">AI Helper</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Ask questions and get help any time — a supportive AI study buddy for this course.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </button>

        <div className="flex items-start gap-4 bg-white/20 backdrop-blur rounded-3xl border border-white/40 p-5 opacity-70">
          <div className="w-12 h-12 rounded-2xl bg-gray-300 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800">Classmates & Teacher</p>
              <span className="text-[10px] font-semibold text-gray-500 bg-white/50 border border-white/50 rounded-full px-2 py-0.5">
                🔜 Coming soon
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              Chatting with classmates and your teacher will live here once teacher accounts and
              classes exist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
