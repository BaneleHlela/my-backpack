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
import { useSpeak, useSpeech } from 'react-text-to-speech';
import { ASSETS } from '@my-backpack/shared';
import type { AgeGroup, IQuestionContent, IQuestionHelpers, IDraggable } from '@my-backpack/shared';
import { DEFAULT_TTS_VOICE } from '../../../lib/lang';

interface DndSinglePatternProps {
  content: IQuestionContent;
  helpers: IQuestionHelpers;
  ageGroup?: AgeGroup;
  lang: string;
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

// Fisher-Yates — unbiased in-place shuffle, returns a new array.
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Tiles shrink gracefully as draggable count escalates (1 -> 2 -> 5 across the vowels quiz
// variants) instead of overflowing a small phone width at the high end.
const CHILD_TILE_SIZE = { width: 'clamp(56px, 18vw, 76px)', height: 'clamp(56px, 18vw, 76px)' };

function DraggableItem({
  item,
  disabled,
  highlight,
  showLabel = true,
  isChild,
  onTap,
}: {
  item: IDraggable;
  disabled?: boolean;
  highlight?: boolean;
  showLabel?: boolean;
  isChild?: boolean;
  onTap?: (item: IDraggable) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled,
  });
  const imageUrl = resolveAssetUrl(item.imageUrl);

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), ...(isChild ? CHILD_TILE_SIZE : undefined) }}
      {...listeners}
      {...attributes}
      onClick={() => onTap?.(item)}
      className={`touch-none select-none flex-shrink-0 flex flex-col items-center justify-center gap-1.5 transition-colors ${
        isChild
          ? 'rounded-2xl border-[3px] border-violet-200 bg-white'
          : 'rounded-2xl font-semibold text-lg text-gray-800 hover:bg-white/70'
      } ${isDragging ? 'opacity-40' : ''} ${highlight ? 'ring-4 ring-amber-300' : ''}`}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.label}
          className={`object-contain pointer-events-none ${isChild ? 'w-full h-full p-2' : 'w-16 h-16'}`}
        />
      )}
      {showLabel && <span>{item.label}</span>}
    </button>
  );
}

// Default background for every dnd_single drop zone — a question's own
// dropZone.imageUrl (if set) takes priority over this.
const DEFAULT_DROP_ZONE_BACKGROUND = ASSETS.DROP_ZONES.CLASSROOM_BOARD;

function DropZoneArea({
  id,
  label,
  placed,
  disabled,
  wrong,
  showLabel,
  imageUrl,
  isChild,
  onTap,
}: {
  id: string;
  label?: string;
  placed: IDraggable | null;
  disabled?: boolean;
  wrong?: boolean;
  showLabel?: boolean;
  imageUrl?: string;
  isChild?: boolean;
  onTap?: (item: IDraggable) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  const background = resolveAssetUrl(imageUrl) ?? DEFAULT_DROP_ZONE_BACKGROUND;

  return (
    <div
      ref={setNodeRef}
      style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      className={`flex items-center justify-center transition-colors ${
        isChild ? 'flex-1 min-h-0 rounded-3xl border-[3px]' : 'min-h-[170px] rounded-2xl border-2'
      } border-dashed ${
        wrong
          ? 'border-rose-400 bg-rose-50/40'
          : isOver
          ? 'border-violet-400 bg-violet-50/40'
          : isChild
          ? 'border-violet-200 bg-white/40'
          : 'border-white/60'
      }`}
    >
      {placed ? (
        <DraggableItem item={placed} disabled={disabled} showLabel={showLabel} isChild={isChild} onTap={onTap} />
      ) : (
        <span className="text-sm text-gray-400">{label ?? 'Drop here'}</span>
      )}
    </div>
  );
}

export default function DndSinglePattern({
  content,
  helpers,
  ageGroup,
  lang,
  disabled,
  isSubmitting,
  onAnswer,
}: DndSinglePatternProps) {
  const isChild = ageGroup === 'child';
  const draggables = content.draggables ?? [];
  const dropZone = content.dropZones?.[0];

  const [placedId, setPlacedId] = useState<string | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(helpers.hintsAllowed);
  const [hintActive, setHintActive] = useState(false);
  const [hintButtonReady, setHintButtonReady] = useState(helpers.hintDelaySeconds === 0);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  // Randomized once per question load (not re-shuffled on every re-render) when
  // helpers.shuffleDraggables is set — falls back to the authored content.draggables order.
  const [orderedDraggables, setOrderedDraggables] = useState<IDraggable[]>(() =>
    helpers.shuffleDraggables ? shuffle(draggables) : draggables
  );
  const submittedRef = useRef(false);

  // Replay always speaks the dialogue live (word-highlighted) rather than playing
  // avatar.dialogueAudioUrl — an explicit product decision for this control, overriding the
  // general "prerecorded audio wins" rule elsewhere (see live-tts-word-highlighting.md).
  const { Text: DialogueText, start: startDialogueSpeech, stop: stopDialogueSpeech } = useSpeech({
    text: content.avatar?.dialogue ?? '',
    lang,
    voiceURI: DEFAULT_TTS_VOICE,
    highlightText: true,
    highlightMode: 'word',
  });

  // Tap/drag a draggable item to hear it — prerecorded item.audioUrl wins when set (this is
  // the phonetic-accuracy-critical case, e.g. isiZulu vowel/consonant recordings), live TTS
  // of item.label fills the gap when it isn't (e.g. math draggables with no recording).
  const { speak: speakItemLabel } = useSpeak();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Reset per-question state whenever a new question loads.
  useEffect(() => {
    setPlacedId(null);
    setHintsRemaining(helpers.hintsAllowed);
    setHintActive(false);
    setHintButtonReady(helpers.hintDelaySeconds === 0);
    setWrongAttempt(false);
    setOrderedDraggables(helpers.shuffleDraggables ? shuffle(content.draggables ?? []) : (content.draggables ?? []));
    submittedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    if (helpers.hintDelaySeconds === 0 || hintButtonReady) return;
    const timer = setTimeout(() => setHintButtonReady(true), helpers.hintDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [helpers.hintDelaySeconds, hintButtonReady]);

  if (!dropZone) return null;

  const placedItem = orderedDraggables.find((d) => d.id === placedId) ?? null;
  const poolItems = orderedDraggables.filter((d) => d.id !== placedId);
  const correctId = dropZone.requiredDraggableIds[0];

  const submit = (finalPlacedId: string | null) => {
    if (disabled || submittedRef.current || !finalPlacedId) return;
    submittedRef.current = true;
    onAnswer(
      JSON.stringify({ placements: [{ draggableId: finalPlacedId, dropZoneId: dropZone.id }] })
    );
  };

  const playItemAudio = (item?: IDraggable) => {
    if (!item) return;
    if (item.audioUrl) playAudio(item.audioUrl);
    else if (item.label) speakItemLabel(item.label, { lang, voiceURI: DEFAULT_TTS_VOICE });
  };

  const handleDragStart = (event: DragStartEvent) => {
    playItemAudio(draggables.find((d) => d.id === event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (over?.id === dropZone.id) {
      const isCorrectDrop = dropZone.requiredDraggableIds.includes(active.id as string);
      if (helpers.retryUntilCorrect && !isCorrectDrop) {
        // Rejected client-side — never reaches onAnswer, item bounces back to the pool.
        playAudio(content.tryAgainFeedback?.audioUrl);
        setWrongAttempt(true);
        setTimeout(() => setWrongAttempt(false), 700);
        return;
      }
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
    if (content.avatar?.dialogue) {
      stopDialogueSpeech();
      startDialogueSpeech();
    } else if (placedItem) {
      playAudio(placedItem.audioUrl);
    }
  };

  const dragAreaBackground = resolveAssetUrl(content.dragAreaImageUrl);
  const wrongAvatarUrl =
    content.avatar &&
    ASSETS.AVATARS.image(
      content.avatar.avatarId,
      content.tryAgainFeedback?.avatarEmotion ?? content.avatar.emotion
    );
  const promptAvatarUrl = content.avatar && ASSETS.AVATARS.image(content.avatar.avatarId, content.avatar.emotion);

  if (isChild) {
    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden gap-3 p-3">
          {content.avatar?.dialogue && (
            <div className="flex-shrink-0 flex items-start gap-3">
              {promptAvatarUrl && (
                <img
                  src={promptAvatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-contain flex-shrink-0 mt-2"
                />
              )}
              <div 
                className="bg-white
                  rounded-[25px]
                  shadow-xl
                  border-4 border-violet-300
                  p-6
                  flex
                  items-center
                  justify-center"
              >
                <DialogueText className="text-2xl font-bold text-slate-700 text-center flex-1" />
              </div>

              <div className="hidden flex flex-col gap-2">
                <button
                  type="button"
                  onClick={replayPrompt}
                  aria-label="Replay"
                  className="w-14 h-14 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Volume2 className="w-6 h-6 text-amber-700" />
                </button>

                {helpers.hintsAllowed > 0 && hintButtonReady && (
                  <button
                    type="button"
                    onClick={useHint}
                    disabled={hintsRemaining <= 0}
                    aria-label={`Hint (${hintsRemaining} left)`}
                    className="w-14 h-14 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center active:scale-95 disabled:opacity-40 transition-transform"
                  >
                    <Lightbulb className="w-6 h-6 text-amber-600" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-shrink-0 flex flex-wrap gap-3 justify-center">
            {poolItems.map((item) => (
              <DraggableItem
                key={item.id}
                item={item}
                disabled={disabled}
                highlight={hintActive && item.id === correctId}
                showLabel={false}
                isChild
                onTap={playItemAudio}
              />
            ))}
          </div>

          <DropZoneArea
            id={dropZone.id}
            label={dropZone.label}
            placed={placedItem}
            disabled={disabled}
            wrong={wrongAttempt}
            showLabel={helpers.showItemLabels}
            imageUrl={dropZone.imageUrl}
            isChild
            onTap={playItemAudio}
          />

          {wrongAttempt && wrongAvatarUrl && (
            <div className="flex-shrink-0 flex justify-center">
              <img src={wrongAvatarUrl} alt="" className="w-20 h-20 object-contain" />
            </div>
          )}

          {!helpers.autoSubmit && (
            <button
              type="button"
              disabled={!placedId || disabled}
              onClick={() => submit(placedId)}
              className="flex-shrink-0 w-full py-3.5 rounded-2xl bg-violet-500 text-white text-base font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </DndContext>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        className={`flex-1 min-h-0 flex flex-col justify-between space-y-5 overflow-y-auto ${dragAreaBackground ? '' : 'bg-amber-600'}`}
        style={
          dragAreaBackground
            ? { backgroundImage: `url(${dragAreaBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {content.avatar?.dialogue && <DialogueText className="text-lg text-gray-800" />}

        <div className="flex flex-wrap gap-3 justify-center">
          {poolItems.map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              disabled={disabled}
              highlight={hintActive && item.id === correctId}
              showLabel={false}
              onTap={playItemAudio}
            />
          ))}
        </div>

        <DropZoneArea
          id={dropZone.id}
          label={dropZone.label}
          placed={placedItem}
          disabled={disabled}
          wrong={wrongAttempt}
          showLabel={helpers.showItemLabels}
          imageUrl={dropZone.imageUrl}
          onTap={playItemAudio}
        />

        {wrongAttempt && wrongAvatarUrl && (
          <div className="flex justify-center">
            <img src={wrongAvatarUrl} alt="" className="w-20 h-20 object-contain" />
          </div>
        )}

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
