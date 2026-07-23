// Repeatable IDraggable[] editor for DnD question types. `quantity` is only shown for
// dnd_count, per the design doc's DnD archetype field list.
import { Plus, Trash2 } from 'lucide-react';
import AssetPicker from './AssetPicker';
import type { IDraggable } from '@my-backpack/shared';

interface DraggableEditorProps {
  value: IDraggable[];
  onChange: (value: IDraggable[]) => void;
  showQuantity: boolean;
}

export default function DraggableEditor({ value, onChange, showQuantity }: DraggableEditorProps) {
  const update = (idx: number, patch: Partial<IDraggable>) => {
    onChange(value.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, { id: `item-${value.length + 1}`, label: '' }]);

  return (
    <div className="flex flex-col gap-2">
      {value.map((draggable, idx) => (
        <div key={idx} className="bg-white/40 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={draggable.id}
              onChange={(e) => update(idx, { id: e.target.value })}
              placeholder="id"
              className="w-24 text-xs font-mono bg-white/70 border border-white/60 rounded-lg px-2 py-1.5"
            />
            <input
              value={draggable.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              placeholder="Label (e.g. cat, 4, A)"
              className="flex-1 text-sm bg-white/70 border border-white/60 rounded-lg px-2.5 py-1.5"
            />
            {showQuantity && (
              <input
                type="number"
                min={1}
                value={draggable.quantity ?? ''}
                onChange={(e) => update(idx, { quantity: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Qty"
                className="w-16 text-sm bg-white/70 border border-white/60 rounded-lg px-2 py-1.5"
              />
            )}
            <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <AssetPicker
              assetType="images"
              value={draggable.imageUrl}
              onChange={(imageUrl) => update(idx, { imageUrl })}
              label="Image"
            />
            <AssetPicker
              assetType="audio"
              value={draggable.audioUrl}
              onChange={(audioUrl) => update(idx, { audioUrl })}
              label="Audio"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 self-start"
      >
        <Plus className="w-3.5 h-3.5" /> Add draggable
      </button>
    </div>
  );
}
