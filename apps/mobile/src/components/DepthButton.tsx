// A pressable "3D gloss button" primitive — built from plain Views, not an image/SVG asset, so
// it always renders crisply at any size and its look is fully controllable via props (color,
// size, border radius, depth, gloss). Generalizes the two-tone "outer darker + inset lighter"
// depth trick CoursePathActions.tsx already uses for its FABs (see ActionButton there) into a
// reusable component, adding a gloss highlight on top — was originally prototyped as a bundled
// Kenney UI Pack SVG (button_round_depth_gloss), but that rendered inconsistently, so this
// replaces it. Meant for reuse anywhere on the platform that wants this look (roadmap node
// badges today; FABs/big circular CTAs are natural future callers), not just NodeButton.
//
// Depth/gloss are achieved with plain semi-transparent black/white overlays rather than
// computing lighter/darker shades of `color` — that works for any color string a caller passes
// (hex, rgb(), theme token, whatever) with no color-math utility needed:
// - `base` is a full-size `color` fill; a semi-transparent black layer on top of it darkens it
//   uniformly. `face` (the actual pressable surface) sits inset on top, so only a thin ring
//   (all sides, `borderWidth`) and a thicker rim (bottom only, `borderWidth + depth`) of that
//   darkened base peek out — the "3D thickness" edge.
// - `face` itself stays a flat `color` fill; gloss is two pieces layered on top of it, both
//   tinted via a semi-transparent white baked straight into `backgroundColor`
//   (`rgba(255,255,255,glossOpacity)`) rather than RN's `opacity` prop — `opacity` composites a
//   view's whole subtree at that reduced alpha before blending it with what's behind, so an
//   opaque child nested inside a translucent parent gets dragged down in opacity too, which the
//   second piece below can't afford. The two pieces: a flat top-half fill (unchanged — no
//   gradient, matches the source asset's own flat two-tone split), and a bottom-half frame inset
//   by `borderWidth` (the same padding-wrapper trick `base`→`face` already uses one layer out)
//   wrapping an unglossed `color` "core" — the smallest shape in the whole stack, so the gloss
//   reads as a highlight *border* around the bottom half rather than a hard cutoff at the
//   middle. `borderWidth: 0` collapses the frame to nothing (the core fills it edge-to-edge).
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii } from '@my-backpack/shared';

interface DepthButtonProps {
  width: number;
  height?: number;
  color: string;
  borderRadius?: number;
  depth?: number;
  shadowColor?: string;
  showGloss?: boolean;
  glossOpacity?: number;
  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_BORDER_RADIUS = radii.full;
const DEFAULT_DEPTH = 4;
const DEFAULT_SHADOW_COLOR = '#7045B8';
const DEFAULT_GLOSS_OPACITY = 0.28;

export function DepthButton({
  width,
  height,
  color,
  borderRadius = DEFAULT_BORDER_RADIUS,
  depth = DEFAULT_DEPTH,
  shadowColor = DEFAULT_SHADOW_COLOR,
  showGloss = true,
  glossOpacity = DEFAULT_GLOSS_OPACITY,
  onPress,
  disabled = false,
  children,
  style,
}: DepthButtonProps) {
  const h = height ?? width;
  const isInteractive = !disabled && !!onPress;
  const glossColor = `rgba(255,255,255,${glossOpacity})`;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={({ pressed }) => [
        {
          width,
          height: h,
        },
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      {/* Bottom / shadow button */}
      <View
        style={[
          styles.button,
          {
            width,
            height: h,
            borderRadius,
            backgroundColor: shadowColor,
          },
        ]}
      />

      {/* Top / main button — EXACT same dimensions */}
      <View
        style={[
          styles.button,
          {
            width,
            height: h,
            borderRadius,
            backgroundColor: color,
            top: -depth,
          },
        ]}
      >
        {/* Top-half gloss */}
        {showGloss && (
          <View
            style={[
              styles.gloss,
              {
                backgroundColor: glossColor,
              },
            ]}
          />
        )}
      </View>

      {/* Content */}
      {children && (
        <View style={styles.content} pointerEvents="none">
          {children}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },

  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },

  content: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});