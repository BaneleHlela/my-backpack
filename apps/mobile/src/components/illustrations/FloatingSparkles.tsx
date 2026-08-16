// A handful of small looping sparkle/dot shapes, drifting and fading — decorative flair for the
// launch screen and the new full-bleed auth/profile backgrounds (August 2026 design pass).
// Hand-built via react-native-svg + Reanimated rather than an external Lottie file — no such
// library is installed in this app, and this uses the exact same technique NodeButton.tsx's
// `CurrentPulse` already established (looping useSharedValue transforms), just applied to a
// small scattered field of shapes instead of one ring. Purely decorative: absolute-fill,
// pointerEvents="none", so it never intercepts touches.
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

export interface SparklePoint {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  color: string;
  delay: number;
  duration: number;
  kind: 'star' | 'dot';
}

interface FloatingSparklesProps {
  points: SparklePoint[];
}

export function FloatingSparkles({ points }: FloatingSparklesProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {points.map((p, i) => (
        <Sparkle key={i} {...p} />
      ))}
    </View>
  );
}

function Sparkle({ top, left, size, color, delay, duration, kind }: SparklePoint) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + progress.value * 0.55,
    transform: [{ scale: 0.7 + progress.value * 0.5 }, { translateY: -progress.value * 10 }],
  }));

  return (
    <Animated.View style={[styles.point, { top, left }, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {kind === 'star' ? (
          <Path
            d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"
            fill={color}
          />
        ) : (
          <Circle cx={12} cy={12} r={6} fill={color} />
        )}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  point: {
    position: 'absolute',
  },
});
