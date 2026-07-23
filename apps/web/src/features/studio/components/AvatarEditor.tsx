// Optional IAvatarConfig editor, available on any question type.
import AssetPicker from './AssetPicker';
import type { IAvatarConfig } from '@my-backpack/shared';

const EMOTIONS: IAvatarConfig['emotion'][] = [
  'happy',
  'thinking',
  'excited',
  'encouraging',
  'sad',
  'serious',
  'smiling',
];

interface AvatarEditorProps {
  value: IAvatarConfig | undefined;
  onChange: (value: IAvatarConfig | undefined) => void;
}

export default function AvatarEditor({ value, onChange }: AvatarEditorProps) {
  const isEnabled = value !== undefined;

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) =>
            onChange(e.target.checked ? { avatarId: '', dialogue: '', emotion: 'happy' } : undefined)
          }
          className="rounded"
        />
        Include an avatar
      </label>

      {isEnabled && value && (
        <div className="flex flex-col gap-2 pl-1">
          <input
            value={value.avatarId}
            onChange={(e) => onChange({ ...value, avatarId: e.target.value })}
            placeholder="Avatar id (e.g. miss-tutor)"
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          />
          <textarea
            value={value.dialogue}
            onChange={(e) => onChange({ ...value, dialogue: e.target.value })}
            placeholder="What the avatar says"
            rows={2}
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 resize-none"
          />
          <AssetPicker
            assetType="audio"
            value={value.dialogueAudioUrl}
            onChange={(dialogueAudioUrl) => onChange({ ...value, dialogueAudioUrl })}
            label="Voiced dialogue (optional)"
          />
          <select
            value={value.emotion}
            onChange={(e) => onChange({ ...value, emotion: e.target.value as IAvatarConfig['emotion'] })}
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          >
            {EMOTIONS.map((emotion) => (
              <option key={emotion} value={emotion}>
                {emotion}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
