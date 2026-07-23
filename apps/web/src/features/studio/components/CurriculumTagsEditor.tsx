// Repeatable { curriculum, gradeLevel } tag editor — reused by Course and Node forms, both of
// which share the exact same ICurriculumTag shape.
import { Plus, X } from 'lucide-react';
import type { ICurriculumTag, CurriculumType } from '@my-backpack/shared';

const CURRICULUM_OPTIONS: CurriculumType[] = ['CAPS', 'IEB', 'Cambridge', 'University', 'Other'];

interface CurriculumTagsEditorProps {
  value: ICurriculumTag[];
  onChange: (tags: ICurriculumTag[]) => void;
}

export default function CurriculumTagsEditor({ value, onChange }: CurriculumTagsEditorProps) {
  const update = (idx: number, patch: Partial<ICurriculumTag>) => {
    onChange(value.map((tag, i) => (i === idx ? { ...tag, ...patch } : tag)));
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...value, { curriculum: 'CAPS', gradeLevel: '' }]);
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((tag, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            value={tag.curriculum}
            onChange={(e) => update(idx, { curriculum: e.target.value as CurriculumType })}
            className="text-sm bg-white/60 border border-white/60 rounded-lg px-2 py-1.5"
          >
            {CURRICULUM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <input
            value={tag.gradeLevel}
            onChange={(e) => update(idx, { gradeLevel: e.target.value })}
            placeholder="Grade level (e.g. Grade 1)"
            className="flex-1 text-sm bg-white/60 border border-white/60 rounded-lg px-2 py-1.5"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-gray-400 hover:text-red-500 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 self-start"
      >
        <Plus className="w-3.5 h-3.5" /> Add curriculum tag
      </button>
    </div>
  );
}
