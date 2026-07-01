// Shared UI for dnd_single — one drop zone, one correct draggable (distractor count
// escalates 1 -> 2 -> 5 across the six quiz variants, see
// docs/content/vowels-dnd-quiz-design.md). content.avatar.dialogue is the on-screen prompt
// for DnD types (content.prompt is reserved for non-DnD types). Tap an item without dragging
// it to hear its audio if content.draggables[].audioUrl is set — dnd-kit's activation
// distance lets a short tap fall through to the native click handler instead of starting a
// drag. helpers.autoSubmit fires the answer the moment an item lands in the drop zone
// (correct or not — a single evaluateDnDAnswer() call server-side is the graded attempt,
// same as every other question type); when false, a Submit button is required instead.
//
// helpers.retryUntilCorrect changes this: correctness is checked locally against
// content.dropZones[].requiredDraggableIds before ever calling onAnswer. A wrong drop shows
// content.tryAgainFeedback and bounces the item back to the pool — it is never submitted to
// the server, so there is no "wrong attempt" AnswerRecord and no way to skip past it (the
// host page hides its Skip button in this mode). Only a correct drop calls onAnswer.
import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, Volume2, Lightbulb } from 'lucide-react';
import { ASSETS } from '@my-backpack/shared';
import type { IQuestionContent, IQuestionHelpers, IDraggable } from '@my-backpack/shared';

interface DndSinglePatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  disabled?: boolean;
  isSubmitting?: boolean;
  onAnswer: (rawResponse: string) => void;
}

function resolveAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${ASSETS.GCS_BASE}/${path}`;
}

function playAudio(path?: string) {
  const url = resolveAssetUrl(path);
  if (url) void new Audio(url).play();
}

function DraggableItem({
  item,
  disabled,
  highlight,
}: {
  item: IDraggable;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => playAudio(item.audioUrl)}
      className={`px-5 py-4 rounded-2xl border font-semibold text-lg bg-white/50 border-white/60 text-gray-800 hover:bg-white/70 transition-colors touch-none select-none ${
        isDragging ? 'opacity-40' : ''
      } ${highlight ? 'ring-4 ring-amber-300' : ''}`}
    >
      {item.label}
    </button>
  );
}

function DropZoneArea({
  id,
  label,
  placed,
  disabled,
  wrong,
}: {
  id: string;
  label?: string;
  placed: IDraggable | null;
  disabled?: boolean;
  wrong?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[96px] rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
        wrong
          ? 'border-rose-400 bg-rose-50/40'
          : isOver
          ? 'border-violet-400 bg-violet-50/40'
          : 'border-white/60 bg-white/20'
      }`}
    >
      {placed ? (
        <DraggableItem item={placed} disabled={disabled} />
      ) : (
        <span className="text-sm text-gray-400">{label ?? 'Drop here'}</span>
      )}
    </div>
  );
}

export default function DndSinglePattern({
  content,
  helpers,
  disabled,
  isSubmitting,
  onAnswer,
}: DndSinglePatternProps) {
  const draggables = content.draggables ?? [];
  const dropZone = content.dropZones?.[0];

  const [placedId, setPlacedId] = useState<string | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(helpers.hintsAllowed);
  const [hintActive, setHintActive] = useState(false);
  const [hintButtonReady, setHintButtonReady] = useState(helpers.hintDelaySeconds === 0);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const submittedRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Reset per-question state whenever a new question loads.
  useEffect(() => {
    setPlacedId(null);
    setHintsRemaining(helpers.hintsAllowed);
    setHintActive(false);
    setHintButtonReady(helpers.hintDelaySeconds === 0);
    setWrongAttempt(false);
    submittedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (helpers.hintDelaySeconds === 0 || hintButtonReady) return;
    const timer = setTimeout(() => setHintButtonReady(true), helpers.hintDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [helpers.hintDelaySeconds, hintButtonReady]);

  if (!dropZone) return null;

  const placedItem = draggables.find((d) => d.id === placedId) ?? null;
  const poolItems = draggables.filter((d) => d.id !== placedId);
  const correctId = dropZone.requiredDraggableIds[0];

  const submit = (finalPlacedId: string | null) => {
    if (disabled || submittedRef.current || !finalPlacedId) return;
    submittedRef.current = true;
    onAnswer(
      JSON.stringify({ placements: [{ draggableId: finalPlacedId, dropZoneId: dropZone.id }] })
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    playAudio(draggables.find((d) => d.id === event.active.id)?.audioUrl);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (over?.id === dropZone.id) {
      setPlacedId(active.id as string);
      if (helpers.autoSubmit) submit(active.id as string);
    } else if (helpers.allowUndo) {
      setPlacedId((current) => (current === active.id ? null : current));
    }
  };

  const useHint = () => {
    if (hintsRemaining <= 0) return;
    setHintsRemaining((n) => n - 1);
    setHintActive(true);
    setTimeout(() => setHintActive(false), 2500);
  };

  const replayPrompt = () => {
    if (content.avatar?.dialogueAudioUrl) playAudio(content.avatar.dialogueAudioUrl);
    else if (placedItem) playAudio(placedItem.audioUrl);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        {content.avatar?.dialogue && <p className="text-lg text-gray-800">{content.avatar.dialogue}</p>}

        <div className="flex flex-wrap gap-3 justify-center">
          {poolItems.map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              disabled={disabled}
              highlight={hintActive && item.id === correctId}
            />
          ))}
        </div>

        <DropZoneArea id={dropZone.id} label={dropZone.label} placed={placedItem} disabled={disabled} />

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={replayPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/40 border border-white/50 text-xs font-medium text-gray-600 hover:bg-white/60 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Replay
          </button>

          {helpers.hintsAllowed > 0 && hintButtonReady && (
            <button
              type="button"
              onClick={useHint}
              disabled={hintsRemaining <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-200 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Hint ({hintsRemaining})
            </button>
          )}
        </div>

        {!helpers.autoSubmit && (
          <button
            type="button"
            disabled={!placedId || disabled}
            onClick={() => submit(placedId)}
            className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </DndContext>
  );
}
