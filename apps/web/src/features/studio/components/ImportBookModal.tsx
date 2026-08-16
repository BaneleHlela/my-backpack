// Book-to-course pipeline (Phases 2-3), Studio frontend — see
// docs/content/book-to-course-design.md. Two-step wizard: upload a PDF (reuses AssetPicker,
// type 'documents') -> suggest a chapter structure via AI -> review/edit the proposed chapters
// (drag-to-reorder, same @dnd-kit SortableList used everywhere else in Studio) -> apply, which
// creates one node + draft reading lesson per chapter. Per-node "Generate practice questions"
// is a separate, later action on NodeDetailPage — not part of this wizard, so an admin can fix
// chapter boundaries before spending an AI call generating questions against them.
import { useState } from 'react';
import { Loader2, Trash2, Plus } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import {
  suggestBookStructure,
  applyBookChapters,
  fetchCourseNodes,
  ProposedBookChapter,
} from '../studioSlice';
import AssetPicker from './AssetPicker';
import SortableList, { DragHandle } from './SortableList';
import Modal from './Modal';

interface ImportBookModalProps {
  courseId: string;
  onClose: () => void;
}

interface DraftChapter {
  id: string; // local-only, for SortableList — never sent to the API
  title: string;
  startPage?: number;
  endPage?: number;
  summary: string;
}

let draftIdCounter = 0;
function nextDraftId(): string {
  draftIdCounter += 1;
  return `draft-${draftIdCounter}`;
}

export default function ImportBookModal({ courseId, onClose }: ImportBookModalProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [pdfPath, setPdfPath] = useState<string | undefined>(undefined);
  const [extractedText, setExtractedText] = useState('');
  const [chapters, setChapters] = useState<DraftChapter[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!pdfPath) return;
    setError(null);
    setIsAnalyzing(true);
    const result = await dispatch(suggestBookStructure({ courseId, pdfPath }));
    setIsAnalyzing(false);
    if (suggestBookStructure.fulfilled.match(result)) {
      setExtractedText(result.payload.extractedText);
      setChapters(
        result.payload.chapters.map((c: ProposedBookChapter) => ({ id: nextDraftId(), ...c }))
      );
      setStep('review');
    } else {
      setError((result.payload as string) ?? 'Failed to analyze the book');
    }
  };

  const updateChapter = (id: string, patch: Partial<DraftChapter>) => {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeChapter = (id: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const addChapter = () => {
    setChapters((prev) => [...prev, { id: nextDraftId(), title: 'New chapter', summary: '' }]);
  };

  const handleApply = async () => {
    if (!pdfPath || chapters.length === 0) {
      setError('At least one chapter is required.');
      return;
    }
    setError(null);
    setIsApplying(true);
    const result = await dispatch(
      applyBookChapters({
        courseId,
        pdfPath,
        extractedText,
        chapters: chapters.map((c) => ({
          title: c.title,
          startPage: c.startPage,
          endPage: c.endPage,
        })),
      })
    );
    setIsApplying(false);
    if (applyBookChapters.fulfilled.match(result)) {
      await dispatch(fetchCourseNodes(courseId));
      onClose();
    } else {
      setError((result.payload as string) ?? 'Failed to create chapters from the book');
    }
  };

  return (
    <Modal
      title="Import from book"
      subtitle={
        step === 'upload'
          ? 'Upload a PDF — Claude will propose a chapter structure to review before anything is created.'
          : 'Review and edit the proposed chapters, then create them as Topics.'
      }
      onClose={onClose}
      maxWidthClassName="max-w-xl"
    >
      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <AssetPicker assetType="documents" value={pdfPath} onChange={setPdfPath} label="Book PDF" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={!pdfPath || isAnalyzing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
            >
              {isAnalyzing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Analyze book
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {chapters.length} chapter{chapters.length === 1 ? '' : 's'} proposed — edit titles,
              page ranges, and order before creating them.
            </p>
            <button
              type="button"
              onClick={addChapter}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800"
            >
              <Plus className="w-3.5 h-3.5" /> Add chapter
            </button>
          </div>

          <SortableList
            items={chapters}
            onReorder={setChapters}
            renderItem={(chapter, _idx, { dragHandleProps }) => (
              <div className="flex items-start gap-2 bg-white/40 border border-white/50 rounded-xl p-3">
                <DragHandle dragHandleProps={dragHandleProps} />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className="w-full text-sm font-semibold bg-white/60 border border-white/60 rounded-lg px-2 py-1.5"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={chapter.startPage ?? ''}
                      onChange={(e) =>
                        updateChapter(chapter.id, {
                          startPage: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="Start page"
                      className="w-24 text-xs bg-white/60 border border-white/60 rounded-lg px-2 py-1"
                    />
                    <span className="text-xs text-gray-400">–</span>
                    <input
                      type="number"
                      value={chapter.endPage ?? ''}
                      onChange={(e) =>
                        updateChapter(chapter.id, {
                          endPage: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="End page"
                      className="w-24 text-xs bg-white/60 border border-white/60 rounded-lg px-2 py-1"
                    />
                  </div>
                  {chapter.summary && <p className="text-xs text-gray-400">{chapter.summary}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeChapter(chapter.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/60 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={isApplying || chapters.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
            >
              {isApplying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create {chapters.length} topic{chapters.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
