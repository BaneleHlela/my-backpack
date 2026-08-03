// Renders a Lesson 'video' resource via expo-video (not expo-av, deprecated). Per Expo's own
// docs, a player connected to a VideoView starts buffering even while paused — so the player is
// created with a null source and only gets `url` (via `player.replace`) once the learner taps
// the placeholder card, avoiding silently spending mobile data before playback is requested.
// No autoplay beyond that tap, matching web's plain <video controls> with no autoPlay attribute;
// VideoView shows native platform controls once playback starts.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Play, RotateCcw } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface LessonVideoProps {
  url: string;
  caption?: string;
}

// There are documented real-world cases (Expo SDK 53+) of `statusChange` getting stuck on
// 'loading' and never transitioning to 'error' for an unavailable/invalid source — this timeout
// is a fallback so the learner isn't stuck on a spinner forever even if that event never fires.
const READY_TIMEOUT_MS = 15000;

export function LessonVideo({ url, caption }: LessonVideoProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const player = useVideoPlayer(null);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [hasStarted, setHasStarted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReadyTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (status === 'readyToPlay' || status === 'error') clearReadyTimeout();
  }, [status]);

  useEffect(() => clearReadyTimeout, []);

  const startPlayback = () => {
    setTimedOut(false);
    setHasStarted(true);
    player.replace(url);
    player.play();
    clearReadyTimeout();
    timeoutRef.current = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
  };

  const isError = hasStarted && (status === 'error' || timedOut);
  const isLoading = hasStarted && !isError && status !== 'readyToPlay';

  return (
    <View style={styles.wrapper}>
      {!hasStarted ? (
        <Pressable onPress={startPlayback}>
          <GlassCard style={styles.placeholder}>
            <View style={styles.playCircle}>
              <Play size={28} color={colors.primary.DEFAULT} />
            </View>
            {caption ? <Text style={styles.placeholderCaption}>{caption}</Text> : null}
          </GlassCard>
        </Pressable>
      ) : (
        <View style={styles.videoBox}>
          <VideoView player={player} style={styles.video} />
          {isLoading && !isError ? (
            <View style={[StyleSheet.absoluteFill, styles.overlay]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
          {isError ? (
            <View style={[StyleSheet.absoluteFill, styles.overlay]}>
              <Text style={styles.errorText}>Couldn't load this video.</Text>
              <Pressable onPress={startPlayback} style={styles.retryButton}>
                <RotateCcw size={16} color="#fff" />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
      {hasStarted && caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.xs,
    },
    placeholder: {
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    playCircle: {
      width: 56,
      height: 56,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderCaption: {
      fontSize: typography.small,
      color: colors.text.secondary,
    },
    videoBox: {
      aspectRatio: 16 / 9,
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    video: {
      width: '100%',
      height: '100%',
    },
    overlay: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    errorText: {
      fontSize: typography.small,
      color: '#fff',
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      backgroundColor: colors.primary.DEFAULT,
    },
    retryText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: '#fff',
    },
    caption: {
      fontSize: typography.small,
      color: colors.text.muted,
    },
  });
}
