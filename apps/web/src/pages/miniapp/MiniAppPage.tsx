// Mini-app entry page. Fetches the MiniApp document for this route and branches
// which screen renders based on its `type` field.
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import axiosInstance from '../../lib/axios';
import type { MiniAppBreadcrumb } from '@my-backpack/shared';
import DictionaryPage from '../DictionaryPage/DictionaryPage';
import BucketPage from '../BucketPage/BucketPage';
import QuizPage from '../QuizPage/QuizPage';

const TYPE_PLACEHOLDERS: Record<string, { emoji: string; label: string }> = {
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
  const location = useLocation();

  const [breadcrumb, setBreadcrumb] = useState<MiniAppBreadcrumb | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fieldSlug || !subjectSlug || !topicSlug || !miniAppSlug) return;
    setIsLoading(true);
    setError(null);
    axiosInstance
      .get(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/topics/${topicSlug}/miniapps/${miniAppSlug}`
      )
      .then((res) => setBreadcrumb(res.data.data as MiniAppBreadcrumb))
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message ?? 'Failed to load mini-app');
      })
      .finally(() => setIsLoading(false));
  }, [fieldSlug, subjectSlug, topicSlug, miniAppSlug]);

  const miniApp = breadcrumb?.miniApp ?? null;

  const breadcrumbs = [
    { label: breadcrumb?.field.name ?? fieldSlug ?? '', href: '/dashboard' },
    { label: breadcrumb?.subject.name ?? subjectSlug ?? '', href: `/subject/${subjectSlug}` },
    { label: breadcrumb?.topic.name ?? topicSlug ?? '', href: `/subject/${subjectSlug}` },
    { label: miniApp?.name ?? miniAppSlug ?? '', href: '#' },
  ].filter((b) => b.label);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error || !miniApp) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-gray-500 mb-4">{error ?? 'Mini-app not found.'}</p>
        <button
          type="button"
          onClick={() => navigate(`/subject/${subjectSlug}`)}
          className="px-5 py-2 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
        >
          Back to roadmap
        </button>
      </div>
    );
  }

  if (miniApp.type === 'dictionary') {
    if (location.pathname.endsWith('/bucket')) {
      return <BucketPage miniApp={miniApp} subjectSlug={subjectSlug ?? ''} />;
    }
    return <DictionaryPage miniApp={miniApp} subjectSlug={subjectSlug ?? ''} />;
  }

  if (miniApp.type === 'quiz') {
    return <QuizPage miniApp={miniApp} subjectSlug={subjectSlug ?? ''} />;
  }

  const placeholder = TYPE_PLACEHOLDERS[miniApp.type] ?? { emoji: '📦', label: 'Coming soon' };

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
        <p className="text-sm text-gray-500">{miniApp.name}</p>
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
