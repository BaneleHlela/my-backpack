// Main dashboard: shows enrolled subjects for the active field, or an empty state.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { setActiveField } from '../../features/enrollment/enrollmentSlice';
import SubjectCard from '../../components/dashboard/SubjectCard';
import EnrollmentModal from '../../components/dashboard/EnrollmentModal';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { enrolledSubjects, activeField, isLoading } = useSelector(
    (state: RootState) => state.enrollment
  );
  const [showModal, setShowModal] = useState(false);

  // Subjects for the currently active field
  const activeFieldData = enrolledSubjects?.fields.find((f) => f.field._id === activeField?._id);
  const subjects = activeFieldData?.subjects ?? [];
  const hasAnyEnrollments = (enrolledSubjects?.fields.length ?? 0) > 0;

  // If user switched to a field that has no activeField set yet, pick the first
  if (!activeField && enrolledSubjects?.fields.length) {
    dispatch(setActiveField(enrolledSubjects.fields[0].field));
  }

  if (isLoading && !enrolledSubjects) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full">
      {!hasAnyEnrollments ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center"
        >
          <div className="text-8xl select-none">🎒</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Your backpack is empty!</h2>
            <p className="text-gray-600 mt-2">Enroll in a subject to start learning.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 transition-colors shadow-lg shadow-violet-300/40"
          >
            <Plus className="w-4 h-4" />
            Add subjects
          </button>
        </motion.div>
      ) : (
        /* ── Subject grid ── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(({ enrollment, subject }, i) => (
              <motion.div
                key={enrollment._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <SubjectCard enrollment={enrollment} subject={subject} />
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add more subjects
            </button>
          </div>
        </>
      )}

      {showModal && <EnrollmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
