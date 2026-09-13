export function dndAppearance(dark: boolean) {
  return {
    panel: dark ? '#25212F' : '#FFF8EE',
    border: dark ? '#40364F' : '#F0E3D2',
    text: dark ? '#FFF8ED' : '#352C40',
    muted: dark ? '#BFB2CF' : '#756680',
    slot: dark ? '#30293D' : '#FFFFFF',
    accent: dark ? '#C5A8FF' : '#7953C8',
    control: dark ? '#3D304E' : '#F0E6FF',
  };
}

// Stable colour per letter: shuffling and placing a tile must not change its colour.
export function dndTileColor(label: string) {
  const palette = ['#8862DF', '#45A568', '#E8B92F', '#538CD6', '#DB779B'];
  const vowel = 'aeiou'.indexOf(label.trim().toLowerCase());
  const hash = Array.from(label).reduce((sum, letter) => sum * 31 + letter.charCodeAt(0), 0) >>> 0;
  return palette[vowel >= 0 ? vowel : hash % palette.length];
}
