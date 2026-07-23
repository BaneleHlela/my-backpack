// /studio/lessons/:lessonId — title + an ordered resources[] editor (video/pdf/image/notes/
// audio/steps). Reached either directly, or from the node page's "+ Add Lesson" which already
// created an empty draft lesson server-side (see NodeDetailPage.handleAddLesson) — this page
// is the sole editor for both the fresh draft and later edits.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Trash2, Video, FileText, Image as ImageIcon, StickyNote, Music, ListOrdered } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchLessonDetail, updateLesson } from '../../features/studio/studioSlice';
import AssetPicker from '../../features/studio/components/AssetPicker';
import SortableList, { DragHandle } from '../../features/studio/components/SortableList';
import type { IResource, ResourceType, IResourceStep } from '@my-backpack/shared';

interface WorkingResource extends IResource {
  id: string;
}

const RESOURCE_TYPES: { type: ResourceType; label: string; icon: typeof Video }[] = [
  { type: 'video', label: 'Video', icon: Video },
  { type: 'pdf', label: 'PDF', icon: FileText },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'notes', label: 'Notes', icon: StickyNote },
  { type: 'audio', label: 'Audio', icon: Music },
  { type: 'steps', label: 'Steps', icon: ListOrdered },
];

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

function stubForType(type: ResourceType, position: number): WorkingResource {
  const base = { id: makeId(), type, position };
  switch (type) {
    case 'video':
    case 'image':
    case 'audio':
      return { ...base, url: '', caption: '' };
    case 'pdf':
      return { ...base, url: '', title: '' };
    case 'notes':
      return { ...base, markdown: '' };
    case 'steps':
      return { ...base, steps: [{ title: '', content: '' }] };
  }
}

function ResourceRow({
  resource,
  onChange,
  onRemove,
  dragHandleProps,
}: {
  resource: WorkingResource;
  onChange: (next: WorkingResource) => void;
  onRemove: () => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const meta = RESOURCE_TYPES.find((t) => t.type === resource.type)!;
  const Icon = meta.icon;

  const updateSteps = (steps: IResourceStep[]) => onChange({ ...resource, steps });

  return (
    <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-3.5">
      <div className="flex items-center gap-2 mb-3">
        <DragHandle dragHandleProps={dragHandleProps} />
        <Icon className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{meta.label}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {(resource.type === 'video' || resource.type === 'image' || resource.type === 'audio') && (
        <div className="flex flex-col gap-2">
          <AssetPicker
            assetType={resource.type === 'video' ? 'video' : resource.type === 'audio' ? 'audio' : 'images'}
            value={resource.url}
            onChange={(url) => onChange({ ...resource, url })}
          />
          <input
            value={resource.caption ?? ''}
            onChange={(e) => onChange({ ...resource, caption: e.target.value })}
            placeholder="Caption (optional)"
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          />
        </div>
      )}

      {resource.type === 'pdf' && (
        <div className="flex flex-col gap-2">
          <AssetPicker assetType="documents" value={resource.url} onChange={(url) => onChange({ ...resource, url })} />
          <input
            value={resource.title ?? ''}
            onChange={(e) => onChange({ ...resource, title: e.target.value })}
            placeholder="Title (optional)"
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          />
        </div>
      )}

      {resource.type === 'notes' && (
        <textarea
          value={resource.markdown ?? ''}
          onChange={(e) => onChange({ ...resource, markdown: e.target.value })}
          placeholder="Markdown notes…"
          rows={5}
          className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 font-mono resize-y"
        />
      )}

      {resource.type === 'steps' && (
        <div className="flex flex-col gap-3">
          {(resource.steps ?? []).map((step, idx) => (
            <div key={idx} className="bg-white/40 rounded-xl p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  value={step.title ?? ''}
                  onChange={(e) =>
                    updateSteps(
                      (resource.steps ?? []).map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                    )
                  }
                  placeholder={`Step ${idx + 1} title (optional)`}
                  className="flex-1 text-sm bg-white/70 border border-white/60 rounded-lg px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => updateSteps((resource.steps ?? []).filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={step.content}
                onChange={(e) =>
                  updateSteps(
                    (resource.steps ?? []).map((s, i) => (i === idx ? { ...s, content: e.target.value } : s))
                  )
                }
                placeholder="Step content (markdown)"
                rows={3}
                className="w-full text-sm bg-white/70 border border-white/60 rounded-lg px-2.5 py-1.5 font-mono resize-y"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateSteps([...(resource.steps ?? []), { title: '', content: '' }])}
            className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 self-start"
          >
            <Plus className="w-3.5 h-3.5" /> Add step
          </button>
        </div>
      )}
    </div>
  );
}

export default function LessonEditorPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { currentLesson, isLoading, isMutating } = useSelector((state: RootState) => state.studio);

  const [title, setTitle] = useState('');
  const [resources, setResources] = useState<WorkingResource[]>([]);
  const [isTypeChooserOpen, setIsTypeChooserOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (lessonId) void dispatch(fetchLessonDetail(lessonId));
  }, [dispatch, lessonId]);

  useEffect(() => {
    if (!currentLesson) return;
    setTitle(currentLesson.title);
    setResources(currentLesson.resources.map((r) => ({ ...r, id: makeId() })));
  }, [currentLesson]);

  if (isLoading && !currentLesson) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!currentLesson || !lessonId) return null;

  const handleSave = async () => {
    const payload: IResource[] = resources.map(({ id: _id, ...rest }, idx) => ({
      ...rest,
      position: idx + 1,
    }));
    const result = await dispatch(updateLesson({ lessonId, input: { title: title.trim(), resources: payload } }));
    if (updateLesson.fulfilled.match(result)) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const addResource = (type: ResourceType) => {
    setResources((prev) => [...prev, stubForType(type, prev.length + 1)]);
    setIsTypeChooserOpen(false);
  };

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate(`/studio/nodes/${currentLesson.nodeId}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to topic
      </button>

      <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-5 mb-6">
        <label className="block text-xs font-medium text-gray-600 mb-1">Lesson title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-lg font-semibold bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800">Resources</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTypeChooserOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Resource
          </button>
          {isTypeChooserOpen && (
            <div className="absolute right-0 mt-1 z-10 bg-white/90 backdrop-blur-md border border-white/60 rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 min-w-[140px]">
              {RESOURCE_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addResource(type)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-violet-50 transition-colors text-left"
                >
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {resources.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center bg-white/20 rounded-2xl border border-white/30 mb-4">
          No resources yet.
        </p>
      )}

      <div className="mb-6">
        <SortableList
          items={resources}
          onReorder={setResources}
          renderItem={(resource, _idx, { dragHandleProps }) => (
            <ResourceRow
              resource={resource}
              dragHandleProps={dragHandleProps}
              onChange={(next) => setResources((prev) => prev.map((r) => (r.id === resource.id ? next : r)))}
              onRemove={() => setResources((prev) => prev.filter((r) => r.id !== resource.id))}
            />
          )}
        />
      </div>

      <div className="flex justify-end items-center gap-3">
        {justSaved && <span className="text-xs text-green-600">Saved</span>}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isMutating}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
        >
          {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save lesson
        </button>
      </div>
    </div>
  );
}
