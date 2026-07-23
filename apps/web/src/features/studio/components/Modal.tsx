// Generic modal shell shared across Content Studio forms/pickers — mirrors the existing
// glassmorphism modal convention (see EnrollmentModal.tsx / PinModal.tsx) so these screens
// look like they belong to the same app.
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}

export default function Modal({ title, subtitle, onClose, children, maxWidthClassName = 'max-w-lg' }: ModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`w-full ${maxWidthClassName} max-h-[85vh] bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden`}
        >
          <div className="flex items-start justify-between p-6 pb-3 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/60 transition-colors text-gray-500 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
