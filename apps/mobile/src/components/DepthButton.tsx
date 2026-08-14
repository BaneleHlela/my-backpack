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
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '@my-backpack/shared';

interface DepthButtonProps {
  width: number;
  height?: number; // defaults to width (square/circular)
  color: string;
  borderRadius?: number; // defaults to radii.full — a fully round button
  borderWidth?: number; // thickness of the ring visible on every side, default 2
  depth?: number; // extra thickness of the shadow rim peeking out at the bottom only, default 3
  shadowColor?: string; // defaults to a generic semi-transparent black — button "physics" colors
  showGloss?: boolean; // default true
  glossOpacity?: number; // default 0.28
  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_BORDER_RADIUS = radii.full;
const DEFAULT_BORDER_WIDTH = 2;
const DEFAULT_DEPTH = 3;
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.35)';
const DEFAULT_GLOSS_OPACITY = 0.28;

export function DepthButton({
  width,
  height,
  color,
  borderRadius = DEFAULT_BORDER_RADIUS,
  borderWidth = DEFAULT_BORDER_WIDTH,
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
      style={({ pressed }) => [{ width, height: h }, pressed && isInteractive && styles.pressed, style]}
    >
      {/* Base + its darkening overlay — together, the ring/rim that peeks out around `face`. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: shadowColor, borderRadius }]} />

      {/* The actual front face — inset more at the bottom than the other 3 sides, so the darkened
          base shows through as a thicker rim there (the "3D thickness" read). */}
      <View
        style={{
          position: 'absolute',
          left: borderWidth,
          right: borderWidth,
          top: borderWidth,
          bottom: borderWidth + depth,
          backgroundColor: color,
          borderRadius,
          overflow: 'hidden',
        }}
      >
        {showGloss && (
          <>
            <View style={[styles.glossTop, { backgroundColor: glossColor }]} />
            <View
              style={[
                styles.glossBottomFrame,
                {
                  backgroundColor: glossColor,
                  borderBottomLeftRadius: borderRadius,
                  borderBottomRightRadius: borderRadius,
                  padding: borderWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.glossBottomCore,
                  { backgroundColor: color, borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius },
                ]}
              />
            </View>
          </>
        )}
      </View>

      {children && (
        <View style={styles.content} pointerEvents="none">
          {children}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  glossTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
  },
  glossBottomFrame: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '50%',
  },
  glossBottomCore: {
    flex: 1,
  },
  content: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
