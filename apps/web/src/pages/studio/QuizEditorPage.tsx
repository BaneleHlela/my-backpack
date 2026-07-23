// /studio/quizzes/:quizId?courseId=&nodeId= — title + settings (timeLimit, feedbackMode,
// shuffleQuestions; mode is always 'fixed' here and never exposed as editable), plus the
// ordered question list with drag-to-reorder, remove, and a two-option "+ Add Question"
// chooser (pick existing vs. create new). courseId/nodeId travel as query params since a Quiz
// document itself has no nodeId, and there's no dashboard GET for a single quiz — this page
// resolves the full quiz via GET /quiz/quizzes?miniAppId=<courseId> (see studioSlice).
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Search, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchQuizDetail,
  updateQuiz,
  updateQuizQuestions,
  searchCourseQuestions,
} from '../../features/studio/studioSlice';
import SortableList, { DragHandle } from '../../features/studio/components/SortableList';
import Modal from '../../features/studio/components/Modal';
import { formatQuestionPreview } from '../../features/studio/utils/questionPreview';
import type { FeedbackMode } from '@my-backpack/shared';

function AddQuestionModal({
  courseId,
  existingIds,
  onClose,
  onPick,
  onCreateNew,
}: {
  courseId: string;
  existingIds: string[];
  onClose: () => void;
  onPick: (questionId: string) => void;
  onCreateNew: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { questionSearchResults, isLoading } = useSelector((state: RootState) => state.studio);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'existing' | 'new'>('existing');

  useEffect(() => {
    void dispatch(searchCourseQuestions({ courseId, search: undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, courseId]);

  const results = questionSearchResults.filter((q) => !existingIds.includes(q._id));

  return (
    <Modal title="Add question" onClose={onClose} maxWidthClassName="max-w-xl">
      <div className="flex gap-1 bg-white/50 rounded-lg p-0.5 mb-3 w-fit">
        <button
          type="button"
          onClick={() => setTab('existing')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            tab === 'existing' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
          }`}
        >
          Pick existing
        </button>
        <button
          type="button"
          onClick={() => setTab('new')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            tab === 'new' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
          }`}
        >
          Create new
        </button>
      </div>

      {tab === 'existing' ? (
        <div>
          <div className="flex items-center gap-2 bg-white/60 border border-white/60 rounded-lg px-2.5 py-1.5 mb-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void dispatch(searchCourseQuestions({ courseId, search }));
              }}
              placeholder="Search this course's questions…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No questions found.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
              {results.map((q) => (
                <button
                  key={q._id}
                  type="button"
                  onClick={() => onPick(q._id)}
                  className="text-left px-3 py-2 rounded-lg hover:bg-white/60 transition-colors"
                >
                  <p className="text-sm text-gray-700 truncate">{formatQuestionPreview(q)}</p>
                  <p className="text-xs text-gray-400">{q.type}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-gray-500 text-center">
            Opens the question editor. Once saved, it's added to this quiz automatically.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-colors"
          >
            Create new question
          </button>
        </div>
      )}
    </Modal>
  );
}

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') ?? '';
  const nodeId = searchParams.get('nodeId') ?? '';
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { currentQuiz, questionCache, isLoading, isMutating } = useSelector(
    (state: RootState) => state.studio
  );

  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('');
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('immediate');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  useEffect(() => {
    if (quizId && courseId) void dispatch(fetchQuizDetail({ courseId, quizId }));
  }, [dispatch, quizId, courseId]);

  useEffect(() => {
    if (courseId) void dispatch(searchCourseQuestions({ courseId, search: undefined }));
  }, [dispatch, courseId]);

  useEffect(() => {
    if (!currentQuiz) return;
    setTitle(currentQuiz.title);
    setTimeLimit(currentQuiz.settings.timeLimit != null ? String(currentQuiz.settings.timeLimit) : '');
    setFeedbackMode(currentQuiz.settings.feedbackMode);
    setShuffleQuestions(currentQuiz.settings.shuffleQuestions);
    setLocalOrder(null);
  }, [currentQuiz]);

  if (isLoading && !currentQuiz) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!currentQuiz || !quizId) return null;

  const questionIds = localOrder ?? currentQuiz.questionIds;
  const rows = questionIds.map((id) => ({ id, question: questionCache[id] }));

  const handleSaveSettings = async () => {
    const result = await dispatch(
      updateQuiz({
        quizId,
        input: {
          title: title.trim(),
          settings: {
            timeLimit: timeLimit.trim() ? Number(timeLimit) : undefined,
            feedbackMode,
            shuffleQuestions,
          },
        },
      })
    );
    if (updateQuiz.fulfilled.match(result)) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const persistOrder = (newIds: string[]) => {
    setLocalOrder(newIds);
    void dispatch(updateQuizQuestions({ quizId, questionIds: newIds }));
  };

  const handleReorder = (newRows: typeof rows) => {
    persistOrder(newRows.map((r) => r.id));
  };

  const handleRemove = (id: string) => {
    persistOrder(questionIds.filter((qid) => qid !== id));
  };

  const handlePick = (questionId: string) => {
    persistOrder([...questionIds, questionId]);
    setIsAddOpen(false);
  };

  const currentPath = `/studio/quizzes/${quizId}?courseId=${courseId}&nodeId=${nodeId}`;

  const handleCreateNew = () => {
    setIsAddOpen(false);
    navigate(
      `/studio/questions/new?courseId=${courseId}&returnTo=${encodeURIComponent(currentPath)}&addToQuiz=${quizId}`
    );
  };

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate(nodeId ? `/studio/nodes/${nodeId}` : '/studio/courses')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to topic
      </button>

      <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quiz title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-semibold bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time limit (seconds)</label>
            <input
              type="number"
              min={0}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="No limit"
              className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Feedback mode</label>
            <select
              value={feedbackMode}
              onChange={(e) => setFeedbackMode(e.target.value as FeedbackMode)}
              className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
            >
              <option value="immediate">Immediate — after each question</option>
              <option value="end">End — all feedback on results screen</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={shuffleQuestions}
            onChange={(e) => setShuffleQuestions(e.target.checked)}
            className="rounded"
          />
          Shuffle question order each session
        </label>

        <div className="flex justify-end items-center gap-3 pt-1">
          {justSaved && <span className="text-xs text-green-600">Saved</span>}
          <button
            type="button"
            onClick={() => void handleSaveSettings()}
            disabled={isMutating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
          >
            {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save settings
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800">Questions</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center bg-white/20 rounded-2xl border border-white/30">
          No questions yet.
        </p>
      )}

      <SortableList
        items={rows}
        onReorder={handleReorder}
        renderItem={({ id, question }, idx, { dragHandleProps }) => (
          <div className="flex items-center gap-3 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-3.5">
            <DragHandle dragHandleProps={dragHandleProps} />
            <span className="text-xs text-gray-400 w-5 flex-shrink-0">{idx + 1}</span>
            <button
              type="button"
              onClick={() => navigate(`/studio/questions/${id}?courseId=${courseId}`)}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-sm text-gray-800 truncate">
                {question ? formatQuestionPreview(question) : 'Loading…'}
              </p>
              {question && <p className="text-xs text-gray-400">{question.type}</p>}
            </button>
            <button
              type="button"
              onClick={() => handleRemove(id)}
              className="text-gray-400 hover:text-red-500 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {isAddOpen && (
        <AddQuestionModal
          courseId={courseId}
          existingIds={questionIds}
          onClose={() => setIsAddOpen(false)}
          onPick={handlePick}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  );
}
