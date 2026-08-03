export const ASSETS = {
  GCS_BASE: "https://storage.googleapis.com/my-backpack-assets",
  wallpapers: {
    square: "https://storage.googleapis.com/my-backpack-assets/wallpapers/1x1/seamless%20pattern%2C%20soft%20pastel%20background%2C%20tiny%20floating%20study%20icons%20%E2%80%94%20books%2C%20pen.webp",
    portrait: "https://storage.googleapis.com/my-backpack-assets/wallpapers/9x16/seamless%20pattern%2C%20soft%20pastel%20background%2C%20tiny%20floating%20study%20icons%20%E2%80%94%20books%2C%20pen.webp",
    landscape: "https://storage.googleapis.com/my-backpack-assets/wallpapers/landscape/landscape-wallpaper.png",
    // TODO(theme, Phase A): the mobile light/dark theme system (see
    // apps/mobile/src/theme/ThemeContext.tsx) needs a dedicated portrait wallpaper per theme.
    // Both are already designed in Figma but have NOT been exported/uploaded to GCS yet — these
    // are deliberate non-URL placeholders (not a guessed GCS path) so ScreenBackground.tsx fails
    // gracefully to its `colors.background` fill instead of loading a wrong asset. Replace both
    // with real `wallpapers/9x16/...` GCS URLs once uploaded, following the question-media
    // upload convention documented in CLAUDE.md.
    portraitLight: "PLACEHOLDER_ASSET_NOT_YET_UPLOADED__wallpapers/9x16/light",
    portraitDark: "PLACEHOLDER_ASSET_NOT_YET_UPLOADED__wallpapers/9x16/dark",
  },
  branding: {
    logo: "https://storage.googleapis.com/my-backpack-assets/branding/logos/logo.png",
  },
  DRAG_AREAS: {
    CLASSROOM_BOARD: "https://storage.googleapis.com/my-backpack-assets/illustrations/drag-areas/26552.jpg",
  },
  DROP_ZONES: {
    // used as the default background for every dnd_single drop zone, covering it entirely
    CLASSROOM_BOARD: "https://storage.googleapis.com/my-backpack-assets/illustrations/drop-zones/classroom-board.png",
  },
  ALPHABET: {
    // cartoon-grouped: uppercase+lowercase pair in one image (e.g. "Aa"), sourced from Vecteezy
    letterCard: (letter: string) =>
      `https://storage.googleapis.com/my-backpack-assets/illustrations/draggables/alphabet/cartoon-grouped/letter-${letter}.png`,
  },
  AVATARS: {
    // generic — works for any avatarId, not just miss-tutor
    image: (avatarId: string, emotion: string) =>
      `https://storage.googleapis.com/my-backpack-assets/illustrations/avatars/${avatarId}/${emotion}.png`,
  },
}