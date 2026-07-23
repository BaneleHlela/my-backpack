// Repeatable IDropZone[] editor. requiredDraggableIds is a multi-select built from whatever
// draggables exist so far — the draggable list must be authored first for this to have
// options. requiredCount is only shown for dnd_count.
import { Plus, Trash2 } from 'lucide-react';
import AssetPicker from './AssetPicker';
import type { IDraggable, IDropZone } from '@my-backpack/shared';

interface DropZoneEditorProps {
  value: IDropZone[];
  onChange: (value: IDropZone[]) => void;
  draggables: IDraggable[];
  showRequiredCount: boolean;
}

export default function DropZoneEditor({ value, onChange, draggables, showRequiredCount }: DropZoneEditorProps) {
  const update = (idx: number, patch: Partial<IDropZone>) => {
    onChange(value.map((z, i) => (i === idx ? { ...z, ...patch } : z)));
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...value, { id: `zone-${value.length + 1}`, requiredDraggableIds: [] }]);

  const toggleRequiredId = (idx: number, draggableId: string) => {
    const current = value[idx].requiredDraggableIds;
    const next = current.includes(draggableId)
      ? current.filter((id) => id !== draggableId)
      : [...current, draggableId];
    update(idx, { requiredDraggableIds: next });
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((zone, idx) => (
        <div key={idx} className="bg-white/40 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={zone.id}
              onChange={(e) => update(idx, { id: e.target.value })}
              placeholder="id"
              className="w-24 text-xs font-mono bg-white/70 border border-white/60 rounded-lg px-2 py-1.5"
            />
            <input
              value={zone.label ?? ''}
              onChange={(e) => update(idx, { label: e.target.value })}
              placeholder="Label (optional, e.g. Animals)"
              className="flex-1 text-sm bg-white/70 border border-white/60 rounded-lg px-2.5 py-1.5"
            />
            {showRequiredCount && (
              <input
                type="number"
                min={0}
                value={zone.requiredCount ?? ''}
                onChange={(e) =>
                  update(idx, { requiredCount: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Count"
                className="w-16 text-sm bg-white/70 border border-white/60 rounded-lg px-2 py-1.5"
              />
            )}
            <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <AssetPicker
            assetType="images"
            value={zone.imageUrl}
            onChange={(imageUrl) => update(idx, { imageUrl })}
            label="Zone background image"
          />

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Draggables that belong here</p>
            {draggables.length === 0 ? (
              <p className="text-xs text-gray-400">Add draggables first.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {draggables.map((d) => {
                  const isChecked = zone.requiredDraggableIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleRequiredId(idx, d.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                        isChecked
                          ? 'bg-violet-100/80 border-violet-300 text-violet-700'
                          : 'bg-white/50 border-white/60 text-gray-500'
                      }`}
                    >
                      {d.label || d.id}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 self-start"
      >
        <Plus className="w-3.5 h-3.5" /> Add drop zone
      </button>
    </div>
  );
}
