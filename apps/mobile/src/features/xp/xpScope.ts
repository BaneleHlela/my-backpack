import type { XpContext, XpSummary } from '@my-backpack/shared';
import type { RootState } from '../../store/store';

export interface XpScope { type: 'total' | 'subject' | 'course' | 'miniApp'; id?: string; name: string }
const humanize = (slug?: string) => slug?.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

export function resolveXpScope(
  params: { subjectSlug?: string; courseSlug?: string; miniAppId?: string; name?: string; courseId?: string; courseName?: string },
  content: RootState['content'], summary: XpSummary | null, context?: XpContext | null
): XpScope {
  if (context) return { type: context.contextType, id: context.contextId, name: context.contextName };
  if (params.miniAppId) {
    const course = Object.values(content.coursesByKey).flat().find((c) => c._id === params.miniAppId);
    const courseTotal = summary?.courses.find((c) => c.id === params.miniAppId);
    if (course || courseTotal) return { type: 'course', id: params.miniAppId, name: course?.name ?? courseTotal!.name };
    const app = Object.values(content.miniAppsBySubject).flat().find((a) => a._id === params.miniAppId);
    return { type: 'miniApp', id: params.miniAppId,
      name: app?.name ?? summary?.miniApps.find((a) => a.id === params.miniAppId)?.name ?? params.name ?? 'Mini-app' };
  }
  const subject = content.enrolledSubjects?.fields.flatMap((f) => f.subjects).find((s) => s.subject.slug === params.subjectSlug)?.subject;
  if (params.courseSlug || params.courseId) {
    const course = [...Object.values(content.coursesByKey).flat(), ...Object.values(content.courseDetailByKey)]
      .find((c) => params.courseId ? c._id === params.courseId : c.slug === params.courseSlug && c.subjectId === subject?._id);
    return { type: 'course', id: course?._id ?? params.courseId, name: course?.name ?? params.courseName ?? humanize(params.courseSlug) ?? 'Course' };
  }
  if (params.subjectSlug) return { type: 'subject', id: subject?._id, name: subject?.name ?? humanize(params.subjectSlug) ?? 'Subject' };
  return { type: 'total', name: 'Total' };
}

export function scopeXp(summary: XpSummary | null, scope: XpScope): number | null {
  if (!summary) return null;
  if (scope.type === 'total') return summary.total;
  if (!scope.id) return null; // Still resolving content: never flash another scope's total.
  const list = scope.type === 'subject' ? summary.subjects : scope.type === 'course' ? summary.courses : summary.miniApps;
  return list.find((s) => s.id === scope.id)?.total ?? 0;
}

export function formatXp(value: number): string {
  return value.toLocaleString('en-ZA', { maximumFractionDigits: 2 }).replace(/,/g, ' ');
}
