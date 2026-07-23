// Derives and renders clickable breadcrumb crumbs from the current URL + Redux state.
import { useLocation, useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';

interface Crumb {
  label: string;
  href: string;
}

function useCrumbs(): Crumb[] {
  const location = useLocation();
  const params = useParams<Record<string, string>>();
  const { enrolledSubjects, activeField } = useSelector((state: RootState) => state.enrollment);
  const { currentLesson } = useSelector((state: RootState) => state.roadmap);
  const { coursesByKey, currentCourse } = useSelector((state: RootState) => state.courses);

  const path = location.pathname;

  if (path === '/dashboard' || path === '/') {
    return [{ label: 'Dashboard', href: '/dashboard' }];
  }

  // /subject/:subjectSlug and descendants
  if (params.subjectSlug) {
    const crumbs: Crumb[] = [];

    // Find field name and subject name from enrolled data
    let fieldName = activeField?.name ?? '';
    let fieldSlug = activeField?.slug ?? '';
    let subjectName = '';

    if (enrolledSubjects) {
      for (const { field, subjects } of enrolledSubjects.fields) {
        const found = subjects.find((s) => s.subject.slug === params.subjectSlug);
        if (found) {
          fieldName = field.name;
          fieldSlug = field.slug;
          subjectName = found.subject.name;
          break;
        }
      }
    }

    if (fieldName) crumbs.push({ label: fieldName, href: '/dashboard' });
    if (subjectName) crumbs.push({ label: subjectName, href: `/subject/${params.subjectSlug}` });

    // Course level
    if (params.courseSlug) {
      const courses = fieldSlug ? (coursesByKey[`${fieldSlug}/${params.subjectSlug}`] ?? []) : [];
      const course = courses.find((c) => c.slug === params.courseSlug) ?? currentCourse;
      crumbs.push({
        label: course?.name ?? params.courseSlug,
        href: `/subject/${params.subjectSlug}/course/${params.courseSlug}`,
      });
    }

    // Lesson level
    if (params.lessonId && currentLesson) {
      crumbs.push({ label: currentLesson.title, href: path });
    }

    return crumbs;
  }

  // /field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug
  if (params.fieldSlug) {
    const crumbs: Crumb[] = [];
    if (params.fieldSlug) crumbs.push({ label: params.fieldSlug, href: '/dashboard' });
    if (params.subjectSlug)
      crumbs.push({ label: params.subjectSlug, href: `/subject/${params.subjectSlug}` });
    if (params.miniAppSlug) crumbs.push({ label: params.miniAppSlug, href: path });
    return crumbs;
  }

  return [];
}

export default function Breadcrumb() {
  const crumbs = useCrumbs();

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-600 overflow-hidden">
      {/* On mobile show only last 2 crumbs with … prefix */}
      {crumbs.length > 2 && (
        <span className="sm:hidden text-gray-400 mr-1">…</span>
      )}
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        // On mobile only render last 2
        const hiddenOnMobile = crumbs.length > 2 && i < crumbs.length - 2;

        return (
          <span
            key={crumb.href + crumb.label}
            className={`flex items-center gap-1 ${hiddenOnMobile ? 'hidden sm:flex' : ''}`}
          >
            {i > 0 && <span className="text-gray-400">/</span>}
            {isLast ? (
              <span className="font-medium text-gray-800 truncate max-w-[120px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className="hover:text-gray-900 hover:underline truncate max-w-[100px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
