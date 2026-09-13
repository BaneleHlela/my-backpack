import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { RotateCcw, Square, Volume2 } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { type PlaybackSource, type PlaybackStatus } from '../lib/audio';
import { useAudioPlayback } from '../lib/useAudioPlayback';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './AppText';

export function AudioIndicator({ status, color, size = 18 }: { status: PlaybackStatus; color: string; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (status !== 'playing' || reduceMotion) { pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration: 350, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [status, reduceMotion, pulse]);
  if (status === 'loading') return <ActivityIndicator size="small" color={color} />;
  if (status === 'error') return <RotateCcw size={size} color={color} />;
  if (status !== 'playing') return <Volume2 size={size} color={color} />;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {[0, 1, 2].map((bar) => (
        <Animated.View key={bar} style={{
          width: 3, height: size - 2, borderRadius: 2, backgroundColor: color,
          transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: bar === 1 ? [1, 0.4] : [0.4, 1] }) }],
        }} />
      ))}
    </View>
  );
}

interface AudioButtonProps extends PlaybackSource {
  label?: string;
  compact?: boolean;
  preload?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AudioButton({ label = 'Play audio', compact = false, preload = true, style, ...source }: AudioButtonProps) {
  const { colors } = useTheme();
  const playback = useAudioPlayback(source, preload);
  const busy = playback.status === 'loading' || playback.status === 'playing';
  const statusLabel = playback.status === 'loading' ? 'Loading…' : playback.status === 'playing' ? 'Playing' : playback.error ? 'Try again' : label;
  const color = compact ? colors.primary.DEFAULT : '#fff';
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? `Stop audio, ${statusLabel}` : playback.error ? `Retry ${label.toLowerCase()}` : label}
        accessibilityHint={playback.error ?? (busy ? 'Tap to stop or cancel playback.' : undefined)}
        accessibilityState={{ busy: playback.status === 'loading', disabled: !playback.available }}
        disabled={!playback.available}
        onPress={(event) => { event.stopPropagation(); playback.toggle(); }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: compact ? colors.surface.glassStrong : colors.primary.dark, borderColor: busy ? colors.primary.DEFAULT : colors.surface.border },
          compact && styles.compact,
          style,
          busy && styles.active,
          !playback.available && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <AudioIndicator status={playback.status} color={color} />
        {!compact ? <Text style={styles.label}>{statusLabel}</Text> : null}
        {!compact && busy ? <Square size={12} color={color} fill={color} /> : null}
      </Pressable>
      {playback.error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error.DEFAULT }]}>{playback.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexShrink: 1, gap: spacing.xs },
  button: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  compact: { width: 44, minHeight: 44, height: 44, paddingHorizontal: 0, paddingVertical: 0, flexShrink: 0 },
  active: { borderWidth: 2 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.45 },
  label: { color: '#fff', fontWeight: '700', fontSize: typography.small, flexShrink: 1 },
  error: { fontSize: typography.small, maxWidth: 260 },
});
