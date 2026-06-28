// Full-screen modal for browsing and enrolling in available subjects.
import { useEffect, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchAvailableSubjects,
  enrollInSubject,
  fetchEnrolledSubjects,
} from '../../features/enrollment/enrollmentSlice';

interface EnrollmentModalProps {
  onClose: () => void;
}

export default function EnrollmentModal({ onClose }: EnrollmentModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { availableSubjects, isLoading } = useSelector((state: RootState) => state.enrollment);
  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
  const [justEnrolledIds, setJustEnrolledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void dispatch(fetchAvailableSubjects(undefined));
  }, [dispatch]);

  // Group by field
  const byField = availableSubjects.reduce<
    Record<string, { fieldName: string; subjects: (typeof availableSubjects)[number][] }>
  >((acc, item) => {
    const key = item.field._id;
    if (!acc[key]) acc[key] = { fieldName: item.field.name, subjects: [] };
    acc[key].subjects.push(item);
    return acc;
  }, {});

  const handleEnroll = async (subjectId: string) => {
    setEnrollingIds((prev) => new Set(prev).add(subjectId));
    const res = await dispatch(enrollInSubject(subjectId));
    if (enrollInSubject.fulfilled.match(res)) {
      setJustEnrolledIds((prev) => new Set(prev).add(subjectId));
    }
    setEnrollingIds((prev) => {
      const next = new Set(prev);
      next.delete(subjectId);
      return next;
    });
  };

  const handleDone = () => {
    if (justEnrolledIds.size > 0) void dispatch(fetchEnrolledSubjects());
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && handleDone()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-2xl max-h-[80vh] bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-8 pb-4 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Choose a subject</h2>
              <p className="text-gray-600 mt-1">What would you like to learn?</p>
            </div>
            <button
              type="button"
              onClick={handleDone}
              className="p-2 rounded-xl hover:bg-white/60 transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
            {isLoading && availableSubjects.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : (
              Object.values(byField).map(({ fieldName, subjects }) => (
                <div key={fieldName}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    {fieldName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map(({ subject, isEnrolled }) => {
                      const enrolled = isEnrolled || justEnrolledIds.has(subject._id);
                      const loading = enrollingIds.has(subject._id);
                      return (
                        <div
                          key={subject._id}
                          className={`rounded-2xl border p-4 flex items-start justify-between gap-3 ${
                            enrolled
                              ? 'bg-violet-50/60 border-violet-200/60'
                              : 'bg-white/40 border-white/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">{subject.name}</p>
                            {subject.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {subject.description}
                              </p>
                            )}
                          </div>
                          {enrolled ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-violet-600 flex-shrink-0 pt-0.5">
                              <Check className="w-3.5 h-3.5" />
                              Enrolled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleEnroll(subject._id)}
                              disabled={loading}
                              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors flex items-center gap-1"
                            >
                              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                              Enroll
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-white/40 flex justify-end">
            <button
              type="button"
              onClick={handleDone}
              className="px-6 py-2.5 rounded-xl bg-violet-500 text-white font-semibold text-sm hover:bg-violet-600 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
