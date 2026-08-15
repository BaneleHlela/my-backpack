// /studio/quizzes/:quizId?courseId=&nodeId= — title + settings (timeLimit, feedbackMode,
// shuffleQuestions; mode is always 'fixed' here and never exposed as editable), plus the
// ordered question list with drag-to-reorder, remove, and a two-option "+ Add Question"
// chooser (pick existing vs. create new). courseId/nodeId still travel as query params (a Quiz
// document itself has no nodeId, and courseId scopes the question search/create flows), but the
// quiz itself resolves via GET /dashboard/quizzes/:quizId (see studioSlice).
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Search, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchQuizDetail,
  updateQuiz,
  updateQuizQuestions,
  updateItemGradeSettings,
  searchCourseQuestions,
} from '../../features/studio/studioSlice';
import SortableList, { DragHandle } from '../../features/studio/components/SortableList';
import Modal from '../../features/studio/components/Modal';
import { formatQuestionPreview } from '../../features/studio/utils/questionPreview';
import { QUIZ_PLAY_MODES, getQuizPlayMode } from '@my-backpack/shared';
import type { FeedbackMode, QuizPlayModeId, QuizPlayModeSettingKey, QuizPlayModeSettings } from '@my-backpack/shared';

// Reads/writes the one mode-specific numeric field a QuizPlayModeDef's settingKey points at —
// mirrors apps/mobile's QuizSettingsModal.tsx's currentValue/setModeValue pattern, since both
// sides edit the identical QuizPlayModeSettings shape.
function readModeSettingValue(settingKey: QuizPlayModeSettingKey, settings: QuizPlayModeSettings): number | undefined {
  if (settingKey === 'none') return undefined;
  return settings[settingKey];
}
function buildModeSettings(settingKey: QuizPlayModeSettingKey, value: number | undefined): QuizPlayModeSettings {
  if (settingKey === 'none' || value === undefined) return {};
  return { [settingKey]: value };
}

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

  const { currentQuiz, questionCache, isLoading, isMutating, error } = useSelector(
    (state: RootState) => state.studio
  );

  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('');
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('immediate');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  // Quiz Mode assignment — at most one mode + its settings, chosen by the teacher; the learner
  // gets no selection screen at all, just this exact configuration. See
  // Quiz.assignedPlayMode / CLAUDE.md's "Quiz Modes" entry.
  const [assignedModeId, setAssignedModeId] = useState<QuizPlayModeId | 'none'>('none');
  const [modeSettingValue, setModeSettingValue] = useState<number | undefined>(undefined);
  const [justSaved, setJustSaved] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  // Grade Settings — held as 0-100 display percentages, converted to 0-1 score ratios on save.
  // Lives on the owning RoadmapNode's item ref (passingScore/starThresholds), not on the Quiz
  // document itself — see updateItemGradeSettings in studioSlice.ts.
  const [passingScorePct, setPassingScorePct] = useState('70');
  const [star1Pct, setStar1Pct] = useState('70');
  const [star2Pct, setStar2Pct] = useState('85');
  const [star3Pct, setStar3Pct] = useState('100');
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [gradeJustSaved, setGradeJustSaved] = useState(false);

  useEffect(() => {
    if (quizId) void dispatch(fetchQuizDetail(quizId));
  }, [dispatch, quizId]);

  useEffect(() => {
    if (courseId) void dispatch(searchCourseQuestions({ courseId, search: undefined }));
  }, [dispatch, courseId]);

  useEffect(() => {
    if (!currentQuiz) return;
    setTitle(currentQuiz.title);
    setTimeLimit(currentQuiz.settings.timeLimit != null ? String(currentQuiz.settings.timeLimit) : '');
    setFeedbackMode(currentQuiz.settings.feedbackMode);
    setShuffleQuestions(currentQuiz.settings.shuffleQuestions);
    if (currentQuiz.assignedPlayMode) {
      const { id, settings } = currentQuiz.assignedPlayMode;
      setAssignedModeId(id);
      setModeSettingValue(readModeSettingValue(getQuizPlayMode(id).settingKey, settings));
    } else {
      setAssignedModeId('none');
      setModeSettingValue(undefined);
    }
    setLocalOrder(null);

    if (currentQuiz.gradeSettings) {
      const { passingScore, starThresholds } = currentQuiz.gradeSettings;
      const byStars = new Map(starThresholds.map((t) => [t.stars, t.minScore]));
      const pct = (ratio: number) => String(Math.round(ratio * 100));
      setPassingScorePct(pct(passingScore));
      setStar1Pct(pct(byStars.get(1) ?? passingScore));
      setStar2Pct(pct(byStars.get(2) ?? 0.85));
      setStar3Pct(pct(byStars.get(3) ?? 1));
    }
  }, [currentQuiz]);

  if (isLoading && !currentQuiz) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error && !currentQuiz) {
    return (
      <div className="max-w-2xl text-center py-16">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button
          type="button"
          onClick={() => navigate(nodeId ? `/studio/nodes/${nodeId}` : '/studio/courses')}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-white/50 border border-white/50 hover:bg-white/70 transition-colors"
        >
          Back to topic
        </button>
      </div>
    );
  }
  if (!currentQuiz || !quizId) return null;

  const questionIds = localOrder ?? currentQuiz.questionIds;
  const rows = questionIds.map((id) => ({ id, question: questionCache[id] }));

  const handleSaveSettings = async () => {
    const assignedPlayMode =
      assignedModeId === 'none'
        ? null
        : { id: assignedModeId, settings: buildModeSettings(getQuizPlayMode(assignedModeId).settingKey, modeSettingValue) };

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
          assignedPlayMode,
        },
      })
    );
    if (updateQuiz.fulfilled.match(result)) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const handleSaveGradeSettings = async () => {
    setGradeError(null);
    const pass = Number(passingScorePct);
    const s1 = Number(star1Pct);
    const s2 = Number(star2Pct);
    const s3 = Number(star3Pct);
    if ([pass, s1, s2, s3].some((n) => Number.isNaN(n) || n < 0 || n > 100)) {
      setGradeError('All percentages must be between 0 and 100.');
      return;
    }
    if (!(s1 <= s2 && s2 <= s3)) {
      setGradeError('Star thresholds must increase from 1★ to 3★.');
      return;
    }
    if (!nodeId) return;

    const result = await dispatch(
      updateItemGradeSettings({
        nodeId,
        itemId: quizId,
        input: {
          passingScore: pass / 100,
          starThresholds: [
            { minScore: s1 / 100, stars: 1 },
            { minScore: s2 / 100, stars: 2 },
            { minScore: s3 / 100, stars: 3 },
          ],
        },
      })
    );
    if (updateItemGradeSettings.fulfilled.match(result)) {
      setGradeJustSaved(true);
      setTimeout(() => setGradeJustSaved(false), 2000);
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

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quiz Mode</label>
          <select
            value={assignedModeId}
            onChange={(e) => {
              const next = e.target.value as QuizPlayModeId | 'none';
              setAssignedModeId(next);
              setModeSettingValue(
                next === 'none' ? undefined : readModeSettingValue(getQuizPlayMode(next).settingKey, getQuizPlayMode(next).defaultSettings)
              );
            }}
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          >
            <option value="none">No specific mode — plays as an ordinary quiz</option>
            {QUIZ_PLAY_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Assign one mode and its settings and the learner is dropped straight into that exact
            gameplay on mobile — no selection screen, nothing to choose. Leave as "No specific
            mode" to play as an ordinary quiz, same as before Quiz Modes existed.
          </p>
        </div>

        {assignedModeId !== 'none' &&
          (() => {
            const def = getQuizPlayMode(assignedModeId);
            return def.settingKey !== 'none' && def.settingOptions ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{def.settingLabel}</label>
                <select
                  value={modeSettingValue ?? ''}
                  onChange={(e) => setModeSettingValue(Number(e.target.value))}
                  className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
                >
                  {def.settingOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-gray-400">{def.blurb}</p>
            );
          })()}

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

      {nodeId && (
        <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-5 mb-6 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Grade Settings</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              How a learner's score on this quiz translates into passing the topic and the
              stars they earn.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pass percentage</label>
            <div className="flex items-center gap-1.5 w-32">
              <input
                type="number"
                min={0}
                max={100}
                value={passingScorePct}
                onChange={(e) => setPassingScorePct(e.target.value)}
                className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Minimum score required to pass this topic and unlock the next one.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Stars awarded at each score
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '1 ★ at ≥', value: star1Pct, onChange: setStar1Pct },
                { label: '2 ★ at ≥', value: star2Pct, onChange: setStar2Pct },
                { label: '3 ★ at ≥', value: star3Pct, onChange: setStar3Pct },
              ].map(({ label, value, onChange }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Only awarded if the learner also meets the pass percentage above. Each tier must be
              greater than or equal to the one before it.
            </p>
          </div>

          {gradeError && <p className="text-xs text-red-500">{gradeError}</p>}

          <div className="flex justify-end items-center gap-3 pt-1">
            {gradeJustSaved && <span className="text-xs text-green-600">Saved</span>}
            <button
              type="button"
              onClick={() => void handleSaveGradeSettings()}
              disabled={isMutating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
            >
              Save grade settings
            </button>
          </div>
        </div>
      )}

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
