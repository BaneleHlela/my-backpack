// Dictionary mini-app screen: search, trending, A-Z browse, recent searches,
// and a term detail view shared across all four entry points. The detail view
// lives on its own route (.../term/:termId) rather than inline state, so it's
// linkable/bookmarkable and supports browser back/forward.
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { IMiniApp } from '@my-backpack/shared';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { setBrowseLetter } from '../../features/vocab/vocabSlice';
import SearchBar from './components/SearchBar';
import TermDetail from './components/TermDetail';
import TrendingTerms from './components/TrendingTerms';
import AlphabetPicker from './components/AlphabetPicker';
import DictionaryBrowseList from './components/DictionaryBrowseList';
import RecentSearches from './components/RecentSearches';

interface DictionaryPageProps {
  miniApp: IMiniApp;
  subjectSlug: string;
}

export default function DictionaryPage({ miniApp, subjectSlug }: DictionaryPageProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { browseLetter } = useSelector((state: RootState) => state.vocab);
  const { fieldSlug, topicSlug, miniAppSlug, termId } = useParams<{
    fieldSlug: string;
    topicSlug: string;
    miniAppSlug: string;
    termId?: string;
  }>();

  const miniAppBasePath = `/field/${fieldSlug}/subject/${subjectSlug}/topic/${topicSlug}/miniapp/${miniAppSlug}`;
  const goToTerm = (id: string) => navigate(`${miniAppBasePath}/term/${id}`);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(`/subject/${subjectSlug}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to roadmap
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-4">{miniApp.name}</h1>

      <div className="mb-6">
        <SearchBar miniAppId={miniApp._id} onSelectTerm={goToTerm} />
      </div>

      {termId ? (
        <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TermDetail
            termId={termId}
            miniAppId={miniApp._id}
            onBack={() => navigate(miniAppBasePath)}
          />
        </motion.div>
      ) : (
        <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <TrendingTerms miniAppId={miniApp._id} onSelectTerm={goToTerm} />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Browse by letter</h3>
            <AlphabetPicker
              miniAppId={miniApp._id}
              activeLetter={browseLetter.toUpperCase()}
              onSelectLetter={(letter) => dispatch(setBrowseLetter(letter))}
            />
            <div className="mt-3">
              <DictionaryBrowseList
                miniAppId={miniApp._id}
                letter={browseLetter}
                onSelectTerm={goToTerm}
              />
            </div>
          </div>

          <RecentSearches miniAppId={miniApp._id} onSelectTerm={goToTerm} />
        </motion.div>
      )}
    </div>
  );
}
