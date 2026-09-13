// Compatibility for imperative TTS callers. All speech shares playback ownership.
import { useCallback } from 'react';
import { usePlayback } from './useAudioPlayback';

export function useSpeak(lang?: string) {
  const playback = usePlayback();
  const speak = useCallback((text: string) => {
    if (text?.trim()) playback.play({ text, language: lang });
  }, [lang, playback.play]);
  return {
    speak, stop: playback.stop,
    isSpeaking: playback.status === 'playing',
    isLoading: playback.status === 'loading',
    error: playback.error,
  };
}
