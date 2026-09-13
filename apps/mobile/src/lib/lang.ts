// Select the subject language; the playback controller chooses an installed matching voice.
export function subjectSlugToLangCode(subjectSlug?: string): string {
  if (subjectSlug === 'isizulu-hl') return 'zu-ZA';
  return 'en-US';
}
