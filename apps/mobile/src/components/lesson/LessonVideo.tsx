// Renders a Lesson 'video' resource via expo-video (not expo-av, deprecated). No autoplay —
// player starts paused, matching web's plain <video controls> with no autoPlay attribute;
// VideoView shows native platform controls by default.
import { StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, radii, spacing, typography } from '@my-backpack/shared';

interface LessonVideoProps {
  url: string;
  caption?: string;
}

export function LessonVideo({ url, caption }: LessonVideoProps) {
  const player = useVideoPlayer(url);

  return (
    <View style={styles.wrapper}>
      <VideoView player={player} style={styles.video} />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    backgroundColor: '#000',
  },
  caption: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
});
