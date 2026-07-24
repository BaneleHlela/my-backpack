// Ports apps/web's src/lib/lang.ts subjectSlugToLangCode() — identical logic. No
// DEFAULT_TTS_VOICE equivalent here: web forces a specific Chrome voice by name
// (voiceURI), but native voice identifiers aren't portable device-to-device the same
// way, so useSpeak() just passes `language` and accepts whatever voice the OS provides.
export function subjectSlugToLangCode(subjectSlug?: string): string {
  if (subjectSlug === 'isizulu-hl') return 'zu-ZA';
  return 'en-US';
}
