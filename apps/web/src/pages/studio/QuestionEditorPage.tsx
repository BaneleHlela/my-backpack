// /studio/questions/new?courseId=&returnTo=&addToQuiz= and /studio/questions/:questionId?courseId=
//
// Type drives which fields render, via the 5-archetype config table in questionArchetypes.ts
// (not a 21-type or even 16-type switch). Client-side validation mirrors the backend's
// Question.pre('validate') hook exactly (see question.model.ts): DnD types need >=1 draggable
// and >=1 drop zone (+ sentenceTemplate for dnd_build); everything else needs a prompt.
//
// Type can't be changed once a question exists — UpdateQuestionInput has no `type` field
// (changing archetype after creation would orphan the old content shape), so the dropdown is
// disabled in edit mode.
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchQuestionDetail,
  createQuestion,
  updateQuestion,
  fetchQuizDetail,
  updateQuizQuestions,
  clearCurrentQuestion,
} from '../../features/studio/studioSlice';
import { ARCHETYPES, archetypeForType, DEFAULT_MAX_POINTS } from '../../features/studio/questionArchetypes';
import AssetPicker from '../../features/studio/components/AssetPicker';
import DraggableEditor from '../../features/studio/components/DraggableEditor';
import DropZoneEditor from '../../features/studio/components/DropZoneEditor';
import BlanksEditor from '../../features/studio/components/BlanksEditor';
import FeedbackEditor from '../../features/studio/components/FeedbackEditor';
import type {
  QuestionType,
  IDraggable,
  IDropZone,
  IBlank,
  IFeedback,
} from '@my-backpack/shared';

function cleanFeedback(feedback: IFeedback): IFeedback | undefined {
  if (!feedback.text && !feedback.audioUrl && (!feedback.highlightWords || feedback.highlightWords.length === 0)) {
    return undefined;
  }
  return feedback;
}

export default function QuestionEditorPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') ?? '';
  const returnTo = searchParams.get('returnTo');
  const addToQuiz = searchParams.get('addToQuiz');
  const isNew = !questionId;

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentQuestion, isLoading, isMutating } = useSelector((state: RootState) => state.studio);

  const [type, setType] = useState<QuestionType>('mcq_term_to_def');
  const [prompt, setPrompt] = useState('');
  const [promptAudioUrl, setPromptAudioUrl] = useState<string | undefined>(undefined);
  const [options, setOptions] = useState<string[]>(['']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  const [draggables, setDraggables] = useState<IDraggable[]>([]);
  const [dropZones, setDropZones] = useState<IDropZone[]>([]);
  const [dragAreaImageUrl, setDragAreaImageUrl] = useState<string | undefined>(undefined);
  const [sentenceTemplate, setSentenceTemplate] = useState('');
  const [blanks, setBlanks] = useState<IBlank[]>([]);

  const [successFeedback, setSuccessFeedback] = useState<IFeedback>({});
  const [tryAgainFeedback, setTryAgainFeedback] = useState<IFeedback>({});

  const [maxPoints, setMaxPoints] = useState('');
  const [pointsCanBePartial, setPointsCanBePartial] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!isNew && questionId && courseId) void dispatch(fetchQuestionDetail({ courseId, questionId }));
    return () => {
      dispatch(clearCurrentQuestion());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isNew, questionId, courseId]);

  useEffect(() => {
    if (!currentQuestion) return;
    const c = currentQuestion.content;
    setType(currentQuestion.type);
    setPrompt(c.prompt ?? '');
    setPromptAudioUrl(c.promptAudioUrl);
    setOptions(c.options && c.options.length > 0 ? c.options : ['']);
    setCorrectAnswer(c.correctAnswer ?? '');
    setExplanation(c.explanation ?? '');
    setDraggables(c.draggables ?? []);
    setDropZones(c.dropZones ?? []);
    setDragAreaImageUrl(c.dragAreaImageUrl);
    setSentenceTemplate(c.sentenceTemplate ?? '');
    setBlanks(c.blanks ?? []);
    setSuccessFeedback(c.successFeedback ?? {});
    setTryAgainFeedback(c.tryAgainFeedback ?? {});
    setMaxPoints(String(currentQuestion.maxPoints));
    setPointsCanBePartial(currentQuestion.pointsCanBePartial);
  }, [currentQuestion]);

  if (!isNew && isLoading && !currentQuestion) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const archetype = archetypeForType(type);
  const isDnd = archetype === 'dndBasic' || archetype === 'dndFillBuild';
  const isFillBuild = archetype === 'dndFillBuild';

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!prompt.trim()) errors.prompt = 'Prompt is required.';
    if (isDnd) {
      if (draggables.length === 0) errors.draggables = 'Add at least one draggable.';
      if (dropZones.length === 0) errors.dropZones = 'Add at least one drop zone.';
      if (isFillBuild && !sentenceTemplate.trim()) {
        errors.sentenceTemplate = 'Sentence template is required for this type.';
      }
    }
    return errors;
  };

  const handleSave = async () => {
    setSaveError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const content = isDnd
      ? {
          prompt: prompt.trim(),
          promptAudioUrl: promptAudioUrl || undefined,
          draggables,
          dropZones,
          dragAreaImageUrl,
          ...(isFillBuild ? { sentenceTemplate: sentenceTemplate.trim(), blanks } : {}),
          successFeedback: cleanFeedback(successFeedback),
          tryAgainFeedback: cleanFeedback(tryAgainFeedback),
        }
      : {
          prompt: prompt.trim(),
          promptAudioUrl: promptAudioUrl || undefined,
          options:
            archetype === 'mcq' ? options.map((o) => o.trim()).filter(Boolean) : undefined,
          correctAnswer: correctAnswer.trim() || undefined,
          explanation: explanation.trim() || undefined,
          successFeedback: cleanFeedback(successFeedback),
          tryAgainFeedback: cleanFeedback(tryAgainFeedback),
        };

    const points = maxPoints.trim() ? Number(maxPoints) : undefined;

    if (isNew) {
      const result = await dispatch(
        createQuestion({ courseId, type, content, maxPoints: points, pointsCanBePartial })
      );
      if (createQuestion.fulfilled.match(result)) {
        const newQuestion = result.payload;
        if (addToQuiz) {
          const quizResult = await dispatch(fetchQuizDetail(addToQuiz));
          if (fetchQuizDetail.fulfilled.match(quizResult)) {
            await dispatch(
              updateQuizQuestions({
                quizId: addToQuiz,
                questionIds: [...quizResult.payload.questionIds, newQuestion._id],
              })
            );
          }
        }
        navigate(returnTo || `/studio/courses`);
      } else {
        setSaveError((result.payload as string) ?? 'Failed to create question');
      }
    } else if (questionId) {
      const result = await dispatch(
        updateQuestion({ questionId, input: { content, maxPoints: points, pointsCanBePartial } })
      );
      if (updateQuestion.fulfilled.match(result)) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } else {
        setSaveError((result.payload as string) ?? 'Failed to save question');
      }
    }
  };

  const updateOption = (idx: number, val: string) =>
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  const removeOption = (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate(returnTo || `/studio/courses/${courseId}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{isNew ? 'New question' : 'Edit question'}</h1>

      <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Question type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            disabled={!isNew}
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 disabled:opacity-60"
          >
            {ARCHETYPES.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!isNew && <p className="text-xs text-gray-400 mt-1">Type can't be changed after creation.</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder='e.g. "Drag the letter E"'
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 resize-none"
          />
          {fieldErrors.prompt && <p className="text-xs text-red-500 mt-1">{fieldErrors.prompt}</p>}
          <div className="mt-2">
            <AssetPicker assetType="audio" value={promptAudioUrl} onChange={setPromptAudioUrl} label="Audio (optional)" />
          </div>
        </div>

        {isDnd ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Draggables</label>
              <DraggableEditor value={draggables} onChange={setDraggables} showQuantity={type === 'dnd_count'} />
              {fieldErrors.draggables && <p className="text-xs text-red-500 mt-1">{fieldErrors.draggables}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Drop zones</label>
              <DropZoneEditor
                value={dropZones}
                onChange={setDropZones}
                draggables={draggables}
                showRequiredCount={type === 'dnd_count'}
              />
              {fieldErrors.dropZones && <p className="text-xs text-red-500 mt-1">{fieldErrors.dropZones}</p>}
            </div>
            <AssetPicker
              assetType="images"
              value={dragAreaImageUrl}
              onChange={setDragAreaImageUrl}
              label="Drag area background (optional)"
            />
            {isFillBuild && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sentence template</label>
                  <input
                    value={sentenceTemplate}
                    onChange={(e) => setSentenceTemplate(e.target.value)}
                    placeholder='e.g. "The ___ sat on the ___"'
                    className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
                  />
                  {fieldErrors.sentenceTemplate && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.sentenceTemplate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Blanks</label>
                  <BlanksEditor value={blanks} onChange={setBlanks} draggables={draggables} />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {archetype === 'mcq' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Options</label>
                <div className="flex flex-col gap-1.5">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => [...prev, ''])}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700 self-start"
                  >
                    + Add option
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Correct answer{archetype === 'trueFalse' ? " ('true' or 'false')" : ''}
              </label>
              {archetype === 'trueFalse' ? (
                <select
                  value={correctAnswer || 'true'}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Explanation</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 resize-none"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/40">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max points</label>
            <input
              type="number"
              min={0}
              value={maxPoints}
              onChange={(e) => setMaxPoints(e.target.value)}
              placeholder={String(DEFAULT_MAX_POINTS[type])}
              className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2">
            <input
              type="checkbox"
              checked={pointsCanBePartial}
              onChange={(e) => setPointsCanBePartial(e.target.checked)}
              className="rounded"
            />
            Allow partial credit
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/40">
          <FeedbackEditor value={successFeedback} onChange={setSuccessFeedback} label="Success feedback" />
          <FeedbackEditor value={tryAgainFeedback} onChange={setTryAgainFeedback} label="Try-again feedback" />
        </div>

        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

        <div className="flex justify-end items-center gap-3 pt-1">
          {justSaved && <span className="text-xs text-green-600">Saved</span>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isMutating}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
          >
            {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'Create question' : 'Save question'}
          </button>
        </div>
      </div>
    </div>
  );
}
