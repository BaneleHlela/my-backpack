// One-off pronunciation playback (search results, term detail, bucket
// entries) via expo-audio's imperative player API — not expo-av, which is
// deprecated. Each call creates its own player since the URL changes per
// tap; released once playback finishes.
import { createAudioPlayer } from 'expo-audio';

export function playAudioUrl(url: string): void {
  const player = createAudioPlayer(url);
  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      subscription.remove();
      player.remove();
    }
  });
  player.play();
}
