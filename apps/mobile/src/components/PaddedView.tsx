// A "padded card" primitive — an outer shell with an optional border (solid or dashed) and an
// optional padding gap between that border and the filled inner face, the face itself holding
// the content. Generalizes the two-layer border+fill sketch prototyped in Scribbler.tsx
// (apps/web/src/pages/Scribbler.tsx) — same idea (an outer bordered/padded shell wrapping an
// inner solid rounded face, nested so the corners stay concentric), made reusable and RN-native.
// Sibling to DepthView/DepthButton (./DepthView.tsx, ./DepthButton.tsx) — deliberately similar
// prop shape (color, borderRadius, width/height, children, style, contentStyle) so the two
// families read as interchangeable at a call site, trading DepthView's shadow-peek "3D plate"
// look for a flat bordered-frame look instead.
//
// `padding`/`borderWidth` both default to 0 (off) — with neither set, PaddedView is just a plain
// rounded color face, which is what most callers actually want (e.g. QuizPickerModal's quiz
// rows: padding 0, no border). Set both to reproduce Scribbler's picture-frame effect — a
// border ring with empty "mat" space between it and the face (e.g. MiniAppGridCard: padding 2,
// a dashed border, exactly mirroring Scribbler's `border-2 border-dashed ... p-2`). The face's
// radius is derived as `borderRadius - padding` (clamped to 0) rather than hardcoded, so the
// outer and inner corners stay concentric at any padding value — Scribbler's own
// rounded-32/rounded-30 pairing is just this formula at padding: 2.
//
// Known RN caveat, not solved here: dashed/dotted borders combined with a nonzero borderRadius
// render inconsistently on Android (a long-standing RN issue — corners can look segmented rather
// than a clean rounded dash) — acceptable for now per this project's "flag what's unverified"
// convention; not yet confirmed on a real Android device.
import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '@my-backpack/shared';

interface PaddedViewProps {
  width?: DimensionValue; // defaults to undefined — sizes to parent/style unless given
  height?: number; // defaults to undefined — auto-sizes to content unless given
  aspectRatio?: number; // e.g. 3 / 4 for a portrait card — also makes the face fill its parent
  color: string;
  borderColor?: string; // defaults to `color` — only visible once borderWidth > 0

  borderRadius?: number;
  padding?: number; // gap between the outer border and the inner face; 0 (default) removes it
  borderWidth?: number; // 0 (default) removes the border entirely
  borderStyle?: ViewStyle['borderStyle']; // 'solid' (default) | 'dashed' | 'dotted'

  children?: ReactNode;
  style?: StyleProp<ViewStyle>; // applied to the outer (bordered/padded) wrapper
  contentStyle?: StyleProp<ViewStyle>; // applied to the inner face's content layout
}

const DEFAULT_BORDER_RADIUS = radii.lg;

export function PaddedView({
  width,
  height,
  aspectRatio,
  color,
  borderColor,
  borderRadius = DEFAULT_BORDER_RADIUS,
  padding = 0,
  borderWidth = 0,
  borderStyle = 'solid',
  children,
  style,
  contentStyle,
}: PaddedViewProps) {
  const innerRadius = Math.max(borderRadius - padding, 0);
  // Whether this instance has a definite (non-auto) height to hand down to its face/content via
  // flex: 1 — mirrors DepthView's own contentFill split (see that file's `content`/`contentFill`
  // styles): with an indefinite parent height there's no "remaining space" to grow into, so a
  // flex: 1 child collapses toward zero instead of hugging its own content.
  const definiteSize = height !== undefined || aspectRatio !== undefined;

  return (
    <View
      style={[
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
    </View>
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
});
