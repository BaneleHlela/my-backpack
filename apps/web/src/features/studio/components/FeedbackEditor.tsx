// Single IFeedback editor, reused for both successFeedback and tryAgainFeedback. highlightWords
// is authored as a comma-separated list and split/joined at the boundary.
import AssetPicker from './AssetPicker';
import type { IFeedback } from '@my-backpack/shared';

interface FeedbackEditorProps {
  value: IFeedback;
  onChange: (value: IFeedback) => void;
  label: string;
}

export default function FeedbackEditor({ value, onChange, label }: FeedbackEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <input
        value={value.text ?? ''}
        onChange={(e) => onChange({ ...value, text: e.target.value || undefined })}
        placeholder="Feedback text (e.g. Well done! That IS a cat!)"
        className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
      />
      <AssetPicker
        assetType="audio"
        value={value.audioUrl}
        onChange={(audioUrl) => onChange({ ...value, audioUrl })}
      />
      <input
        value={(value.highlightWords ?? []).join(', ')}
        onChange={(e) =>
          onChange({
            ...value,
            highlightWords: e.target.value
              ? e.target.value.split(',').map((w) => w.trim()).filter(Boolean)
              : undefined,
          })
        }
        placeholder="Highlight words, comma-separated (e.g. I, AM, A, CAT)"
        className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
      />
    </div>
  );
}
