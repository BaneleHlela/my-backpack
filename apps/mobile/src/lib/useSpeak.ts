// Imperative TTS hook, mirrors apps/web's react-text-to-speech useSpeak — no bound text,
// just speak(text)/stop()/isSpeaking. Built on expo-speech's callback-based Speech.speak API
// (not a reactive hook itself), so isSpeaking is managed locally off its onStart/onDone/
// onStopped/onError callbacks. No voiceURI-equivalent forced here — see lang.ts.
//
// Speech.speak() throws synchronously on some platforms for an unsupported language/voice
// rather than rejecting a promise or firing onError — wrapped in try/catch so that fails
// silently (no-op) instead of crashing the question, matching web's silent-fallback
// behavior for zu-ZA on devices without an isiZulu voice installed.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

export function useSpeak(lang?: string) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (speakingRef.current) Speech.stop();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text?.trim()) return;
      try {
        speakingRef.current = true;
        setIsSpeaking(true);
        Speech.speak(text, {
          language: lang,
          onDone: () => {
            speakingRef.current = false;
            setIsSpeaking(false);
          },
          onStopped: () => {
            speakingRef.current = false;
            setIsSpeaking(false);
          },
          onError: () => {
            speakingRef.current = false;
            setIsSpeaking(false);
          },
        });
      } catch {
        speakingRef.current = false;
        setIsSpeaking(false);
      }
    },
    [lang]
  );

  const stop = useCallback(() => {
    Speech.stop();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
