// Repeatable IBlank[] editor for dnd_fill/dnd_build — each blank is a position in the
// sentenceTemplate paired with which draggable id fills it.
import { Plus, Trash2 } from 'lucide-react';
import type { IBlank, IDraggable } from '@my-backpack/shared';

interface BlanksEditorProps {
  value: IBlank[];
  onChange: (value: IBlank[]) => void;
  draggables: IDraggable[];
}

export default function BlanksEditor({ value, onChange, draggables }: BlanksEditorProps) {
  const update = (idx: number, patch: Partial<IBlank>) => {
    onChange(value.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, { position: value.length, correctDraggableId: draggables[0]?.id ?? '' }]);

  return (
    <div className="flex flex-col gap-2">
      {value.map((blank, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={blank.position}
            onChange={(e) => update(idx, { position: Number(e.target.value) })}
            placeholder="Position"
            className="w-20 text-sm bg-white/60 border border-white/60 rounded-lg px-2 py-1.5"
          />
          <select
            value={blank.correctDraggableId}
            onChange={(e) => update(idx, { correctDraggableId: e.target.value })}
            className="flex-1 text-sm bg-white/60 border border-white/60 rounded-lg px-2 py-1.5"
          >
            <option value="">Select draggable…</option>
            {draggables.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label || d.id}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 self-start"
      >
        <Plus className="w-3.5 h-3.5" /> Add blank
      </button>
    </div>
  );
}
