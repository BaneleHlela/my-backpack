// Non-interactive counterpart to DepthButton (./DepthButton.tsx) — same simple "3D plate" look
// (flat color face, a thin rim/depth peeking out from the base behind it, two fixed translucent
// highlight bands) as a generic container for arbitrary content/layout instead of one centered
// icon.
//
// Sizing contract differs from DepthButton: DepthButton always takes an explicit numeric
// width/height (it wraps one small, fixed-size icon). DepthView auto-sizes to whatever content a
// caller stacks inside it (a "mode name + stat" row, a success/failure feedback card, ...), so
// the rim is built from padding on a normal-flow wrapper (which is what actually determines this
// component's height) instead of DepthButton's absolute-fill-over-an-explicit-size recipe — Yoga
// resolves the parent's size from its normal-flow children first, then sizes the
// absolutely-positioned base/shadow layers to match, so ordering here doesn't matter.
//
// `shadowColor` (unlike DepthButton, which has no equivalent) stays a real prop: AnswerFeedback's
// correct/incorrect/skipped ring overrides it with an opaque tint drawn where the rim peeks out
// from behind the inset face, so it reads as a colored ring around the whole card rather than a
// thin border line — see AnswerFeedback.tsx for that usage.
import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '@my-backpack/shared';

interface DepthViewProps {
  width?: DimensionValue; // defaults to undefined — sizes to parent/style unless given
  height?: number; // defaults to undefined — auto-sizes to content unless given
  color: string;
  shadowColor?: string;

  borderRadius?: number;
  borderWidth?: number;
  depth?: number;

  children?: ReactNode;
  style?: StyleProp<ViewStyle>; // applied to the outer (sizing) wrapper
  contentStyle?: StyleProp<ViewStyle>; // applied to the inner content layout (e.g. row + justify-between)
}

const DEFAULT_BORDER_WIDTH = 0;
const DEFAULT_DEPTH = 3;
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.35)';

export function DepthView({
  width,
  height,
  color,
  shadowColor = DEFAULT_SHADOW_COLOR,
  borderRadius = radii.lg,
  borderWidth = DEFAULT_BORDER_WIDTH,
  depth = DEFAULT_DEPTH,
  children,
  style,
  contentStyle,
}: DepthViewProps) {
  return (
    <View style={[width !== undefined ? { width } : null, style]}>
      {/* Base + its darkening overlay — sized by the padWrap sibling below; shows through as the
          ring/rim around the inset face. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: shadowColor, borderRadius }]} />

      {/* Normal-flow wrapper — its padding (thicker at the bottom) is what reserves the rim, and
          its content is what gives this whole component its natural height. */}
      <View
        style={{
          paddingLeft: borderWidth,
          paddingRight: borderWidth,
          paddingTop: borderWidth,
          paddingBottom: depth,
        }}
      >
        {/* Main face */}
        <View style={[styles.face, { backgroundColor: color, borderRadius }, height ? { height } : null]}>
          {/* Upper face highlight */}
          <View
            pointerEvents="none"
            style={[styles.upperHighlight, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          />

          {/* Lower highlight section */}
          <View
            pointerEvents="none"
            style={[styles.lowerHighlight, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}
          />

          {/* Content */}
          <View style={[styles.content, height ? styles.contentFill : null, contentStyle]}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    overflow: 'hidden',
  },
  upperHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lowerHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: {
    // Deliberately no flex here — `face` has no explicit height in the common (auto-sizing)
    // case, and RN's `flex: 1` shorthand sets flexBasis: 0%, not `auto`. With an indefinite
    // parent height there's no "remaining space" to grow into, so the child collapses toward
    // zero instead of hugging its own content — which, combined with `face`'s
    // `overflow: 'hidden'`, clips away nearly everything. Width still stretches to fill `face`
    // for free via the default `alignItems: 'stretch'`. See `contentFill` below for the
    // explicit-height case.
  },
  contentFill: {
    flex: 1,
  },
});
