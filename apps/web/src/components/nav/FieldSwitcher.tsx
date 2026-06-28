// Dropdown that lets the user switch between enrolled fields.
import { useRef, useState, useEffect } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { setActiveField } from '../../features/enrollment/enrollmentSlice';

export default function FieldSwitcher() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { enrolledSubjects, activeField } = useSelector((state: RootState) => state.enrollment);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fields = enrolledSubjects?.fields ?? [];
  const hasEnrollments = fields.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!hasEnrollments) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/30 border border-white/40">
        <BookOpen className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">My Backpack</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/40 border border-white/50 hover:bg-white/60 transition-colors"
      >
        <BookOpen className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold text-gray-800 hidden sm:inline max-w-[120px] truncate">
          {activeField?.name ?? 'Select Field'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 min-w-[180px] backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            {fields.map(({ field, subjects }) => (
              <button
                key={field._id}
                type="button"
                onClick={() => {
                  dispatch(setActiveField(field));
                  setOpen(false);
                  navigate('/dashboard');
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-white/60 transition-colors ${
                  activeField?._id === field._id ? 'bg-white/50 font-semibold' : ''
                }`}
              >
                <span className="text-sm text-gray-800">{field.name}</span>
                <span className="text-xs text-gray-500 ml-2">{subjects.length}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
