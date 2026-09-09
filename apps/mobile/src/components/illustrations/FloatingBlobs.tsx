// Large soft translucent blobs that slowly drift/breathe in place — decorative background
// texture for the new full-bleed auth/profile/launch screens (August 2026 design pass), instead
// of relying on ScreenBackground's still-unpopulated wallpaper images (see
// packages/shared/constants/assets.ts — portraitLight/portraitDark are placeholders, not real
// GCS URLs yet). Same hand-built Reanimated approach as FloatingSparkles — no external asset.
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export interface BlobSpec {
  top?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  size: number;
  color: string;
  duration?: number;
}

interface FloatingBlobsProps {
  blobs: BlobSpec[];
}

export function FloatingBlobs({ blobs }: FloatingBlobsProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {blobs.map((b, i) => (
        <Blob key={i} {...b} />
      ))}
    </View>
  );
}

function Blob({ top, bottom, left, right, size, color, duration = 6000 }: BlobSpec) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + progress.value * 0.12 },
      { translateY: -progress.value * 14 },
      { translateX: progress.value * 10 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          top,
          bottom,
          left,
          right,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
});
