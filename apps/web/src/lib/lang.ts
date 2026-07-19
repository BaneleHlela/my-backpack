export function subjectSlugToLangCode(subjectSlug?: string): string {
  if (subjectSlug === 'isizulu-hl') return 'zu-ZA';
  return 'en-US';
}

// Preferred browser voice for live TTS (react-text-to-speech's voiceURI matches against
// SpeechSynthesisVoice.voiceURI, which Chrome sets equal to the voice's display name).
// Only available where Chrome's bundled Google voices are installed — silently falls back
// to the browser default elsewhere, same as the zu-ZA limitation in
// docs/content/live-tts-word-highlighting.md.
export const DEFAULT_TTS_VOICE = 'Google US English';
