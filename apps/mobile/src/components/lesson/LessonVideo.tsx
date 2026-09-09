// Renders a Lesson 'video' resource via expo-video (not expo-av, deprecated). Per Expo's own
// docs, a player connected to a VideoView starts buffering even while paused — so the player is
// created with a null source and only gets `url` (via `player.replace`) once the learner taps
// the placeholder card, avoiding silently spending mobile data before playback is requested.
// No autoplay beyond that tap, matching web's plain <video controls> with no autoPlay attribute;
// VideoView shows native platform controls once playback starts.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { CheckCircle, Play, RotateCcw } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

interface LessonVideoProps {
  url: string;
  caption?: string;
  // Phase B (Course & Topic redesign) fields — optional, no backfill on existing Lesson
  // documents. When present, the not-yet-playing placeholder shows the real thumbnail behind
  // the play button, with caption/description rendered below as title/description text
  // (Figma's video-card look); when absent, the placeholder falls back to a flat tinted box.
  thumbnailUrl?: string;
  description?: string;
  // Video-watch tracking (August 2026) — fires at most once per mount, on natural end or
  // ~90% watched, whichever comes first. Optional: ResourcesModal renders this component for
  // course-wide browsing with no lessonId/completion concept and never passes it.
  onWatched?: () => void;
  // Whether this specific video is already known-watched (from the parent's own tracking, or
  // because the whole lesson is already completed) — shows a small checkmark badge so the
  // learner can see at a glance which videos in a multi-video lesson they've already watched.
  // Purely a display flag; has no effect on the onWatched detection logic above.
  watched?: boolean;
}

// "Watched" backstop threshold — reaching this fraction of duration counts the same as
// playing to the natural end, covering the case where `playToEnd` doesn't cleanly fire
// (network hiccup, learner pauses a second early). No anti-scrub enforcement either way —
// matches CLAUDE.md's "we are not scaling yet — keep solutions simple" guidance.
const WATCHED_THRESHOLD = 0.9;

// There are documented real-world cases (Expo SDK 53+) of `statusChange` getting stuck on
// 'loading' and never transitioning to 'error' for an unavailable/invalid source — this timeout
// is a fallback so the learner isn't stuck on a spinner forever even if that event never fires.
const READY_TIMEOUT_MS = 15000;

export function LessonVideo({ url, caption, thumbnailUrl, description, onWatched, watched }: LessonVideoProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // `timeUpdateEventInterval` is set once here, at player creation — this setup callback only
  // re-runs if the (always-null) source changes, so it persists across the later
  // `player.replace(url)` call in startPlayback below.
  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 1;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [hasStarted, setHasStarted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // `statusChange` has documented real-device cases of never reaching 'readyToPlay' even once
  // the player is genuinely decoding and showing frames (see READY_TIMEOUT_MS's comment below) —
  // when that happens our own `isLoading` overlay was staying up forever, silently swallowing
  // every touch meant for the native player's own controls (pause/resume/fullscreen), even
  // though the video was visibly playing underneath it. `onFirstFrameRender` is a second, more
  // direct signal straight from the native view that a frame has actually been drawn, and
  // permanently retires our overlay once it fires, regardless of what `status` does afterward.
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards onWatched so it fires at most once per mount, regardless of how many times
  // playToEnd/timeUpdate trip afterward (a looping learner re-watching, timeUpdate ticking
  // every second past the threshold, etc).
  const hasFiredRef = useRef(false);

  const fireWatched = () => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;
    onWatched?.();
  };

  useEventListener(player, 'playToEnd', () => fireWatched());
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (player.duration && currentTime / player.duration >= WATCHED_THRESHOLD) fireWatched();
  });

  const clearReadyTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (status === 'readyToPlay' || status === 'error' || hasRenderedFrame) clearReadyTimeout();
  }, [status, hasRenderedFrame]);

  useEffect(() => clearReadyTimeout, []);

  const startPlayback = () => {
    setTimedOut(false);
    setHasStarted(true);
    setHasRenderedFrame(false);
    player.replace(url);
    player.play();
    clearReadyTimeout();
    timeoutRef.current = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
  };

  const isError = hasStarted && (status === 'error' || timedOut);
  const isLoading = hasStarted && !isError && status !== 'readyToPlay' && !hasRenderedFrame;

  return (
    <View style={styles.wrapper}>
      {!hasStarted ? (
        <Pressable onPress={startPlayback}>
          <View style={styles.placeholder}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
            <View style={styles.playCircle}>
              <Play size={28} color={colors.primary.DEFAULT} />
            </View>
            {watched ? (
              <View style={styles.watchedBadge} pointerEvents="none">
                <CheckCircle size={14} color="#fff" />
              </View>
            ) : null}
          </View>
          {caption ? <Text style={styles.placeholderCaption}>{caption}</Text> : null}
          {description ? <Text style={styles.placeholderDescription}>{description}</Text> : null}
        </Pressable>
      ) : (
        <View style={styles.videoBox}>
          <VideoView
            player={player}
            style={styles.video}
            nativeControls
            fullscreenOptions={{ enable: true }}
            onFirstFrameRender={() => setHasRenderedFrame(true)}
          />
          {isLoading && !isError ? (
            <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
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
          {watched && !isLoading && !isError ? (
            <View style={styles.watchedBadge} pointerEvents="none">
              <CheckCircle size={14} color="#fff" />
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
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: colors.surface.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playCircle: {
      width: 56,
      height: 56,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Small "watched" checkmark, pinned to the top-right corner over the placeholder or the
    // playing video. `pointerEvents="none"` at every call site so it never intercepts touches
    // meant for the native player's own controls underneath.
    watchedBadge: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      width: 24,
      height: 24,
      borderRadius: radii.full,
      backgroundColor: colors.success.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderCaption: {
      marginTop: spacing.xs,
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.glassText.primary,
    },
    placeholderDescription: {
      fontSize: typography.small,
      color: colors.glassText.secondary,
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
      paddingHorizontal: spacing.sm,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
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
