// Interactive counterpart to PaddedView (./PaddedView.tsx) — same bordered/padded "frame" look
// (see that file's header comment for the Scribbler.tsx origin, the padding/border-optional
// contract, and the dashed+radius Android caveat), wrapped in a Pressable. Mirrors DepthButton's
// relationship to DepthView (./DepthButton.tsx, ./DepthView.tsx), including the pressed-opacity
// treatment — the two button components differ only in which "card" look (3D plate vs. bordered
// frame) they press down on.
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii } from '@my-backpack/shared';

interface PaddedButtonProps {
  width?: DimensionValue;
  height?: number;
  aspectRatio?: number;
  color: string;
  borderColor?: string; // defaults to `color` — only visible once borderWidth > 0

  borderRadius?: number;
  padding?: number; // gap between the outer border and the inner face; 0 (default) removes it
  borderWidth?: number; // 0 (default) removes the border entirely
  borderStyle?: ViewStyle['borderStyle']; // 'solid' (default) | 'dashed' | 'dotted'

  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_BORDER_RADIUS = radii.lg;

export function PaddedButton({
  width,
  height,
  aspectRatio,
  color,
  borderColor,
  borderRadius = DEFAULT_BORDER_RADIUS,
  padding = 0,
  borderWidth = 0,
  borderStyle = 'solid',
  onPress,
  disabled = false,
  children,
  style,
  contentStyle,
}: PaddedButtonProps) {
  const innerRadius = Math.max(borderRadius - padding, 0);
  const definiteSize = height !== undefined || aspectRatio !== undefined;
  const isInteractive = !disabled && !!onPress;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.outer,
        {
          width,
          height,
          aspectRatio,
          borderRadius,
          borderWidth,
          borderColor: borderColor ?? color,
          borderStyle,
          padding,
        },
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      <View
        style={[
          styles.face,
          { backgroundColor: color, borderRadius: innerRadius },
          definiteSize && styles.fill,
        ]}
      >
        <View style={[definiteSize && styles.fill, contentStyle]}>{children}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  face: {
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
