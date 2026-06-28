// Scaffold page for mini-app content (dictionary, quiz, etc.).
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

const TYPE_PLACEHOLDERS: Record<string, { emoji: string; label: string }> = {
  dictionary: { emoji: '📖', label: 'Dictionary coming soon' },
  quiz: { emoji: '🧠', label: 'Quiz coming soon' },
  roadmap: { emoji: '🗺️', label: 'Roadmap coming soon' },
  flashcards: { emoji: '🃏', label: 'Flashcards coming soon' },
  practice: { emoji: '✏️', label: 'Practice coming soon' },
};

export default function MiniAppPage() {
  const { fieldSlug, subjectSlug, topicSlug, miniAppSlug } = useParams<{
    fieldSlug: string;
    subjectSlug: string;
    topicSlug: string;
    miniAppSlug: string;
  }>();
  const navigate = useNavigate();

  const placeholder = TYPE_PLACEHOLDERS[miniAppSlug ?? ''] ?? {
    emoji: '📦',
    label: 'Coming soon',
  };

  const breadcrumbs = [
    { label: fieldSlug ?? '', href: '/dashboard' },
    { label: subjectSlug ?? '', href: `/subject/${subjectSlug}` },
    { label: topicSlug ?? '', href: `/subject/${subjectSlug}` },
    { label: miniAppSlug ?? '', href: '#' },
  ].filter((b) => b.label);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(`/subject/${subjectSlug}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 mb-6 flex-wrap">
        {breadcrumbs.map((b, i) => (
          <span key={b.label} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'text-gray-700 font-medium' : ''}>
              {b.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/30 backdrop-blur rounded-3xl border border-white/40 p-12 flex flex-col items-center gap-4 text-center"
      >
        <span className="text-6xl">{placeholder.emoji}</span>
        <p className="text-lg font-semibold text-gray-700">{placeholder.label}</p>
        <p className="text-sm text-gray-500 capitalize">{miniAppSlug}</p>
        <button
          type="button"
          onClick={() => navigate(`/subject/${subjectSlug}`)}
          className="mt-2 px-5 py-2 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
        >
          Back to roadmap
        </button>
      </motion.div>
    </div>
  );
}
