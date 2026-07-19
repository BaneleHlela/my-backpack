// Interim live TTS (Web Speech API via react-text-to-speech) with word highlighting.
// See docs/content/live-tts-word-highlighting.md — never used where a prerecorded
// audioUrl already exists; playback is manual (icon button), never autoplay.
import { useSpeech } from 'react-text-to-speech';
import { Volume2 } from 'lucide-react';
import { DEFAULT_TTS_VOICE } from '../../lib/lang';

interface SpokenTextProps {
  text: string;
  lang?: string;
  className?: string;
}

const DEFAULT_CLASSNAME = 'text-lg text-gray-800 whitespace-pre-line';

export default function SpokenText({ text, lang = 'en-US', className = DEFAULT_CLASSNAME }: SpokenTextProps) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const { Text, speechStatus, start, stop } = useSpeech({
    text,
    lang,
    voiceURI: DEFAULT_TTS_VOICE,
    highlightText: true,
    highlightMode: 'word',
  });

  if (!supported || !text?.trim()) {
    return <p className={className}>{text}</p>;
  }

  const isSpeaking = speechStatus === 'started';

  return (
    <div className="flex items-start gap-2">
      <Text className={className} />
      <button
        type="button"
        onClick={isSpeaking ? stop : start}
        aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
        className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-colors ${
          isSpeaking ? 'text-violet-600' : 'text-gray-600'
        }`}
      >
        <Volume2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
