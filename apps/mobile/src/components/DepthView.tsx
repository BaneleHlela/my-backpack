// Non-interactive counterpart to DepthButton (./DepthButton.tsx) — same simple "3D plate" look
// (flat color face, a thin rim peeking out from the shadow behind it, one translucent highlight
// band) as a generic container for arbitrary content/layout instead of one centered icon.
//
// Sizing contract differs from DepthButton: DepthButton always takes an explicit numeric
// width/height (it wraps one small, fixed-size icon), so its face can be absolutely positioned
// and shifted straight up by `depth`. DepthView auto-sizes to whatever content a caller stacks
// inside it (a "mode name + stat" row, a success/failure feedback card, ...), so it can't shift a
// same-size sibling that way — there's nothing to measure the shift against yet. Instead the rim
// is reserved with `paddingBottom: depth` on a normal-flow wrapper (which is what actually
// determines this component's height), producing the identical rendered result — the shadow
// peeking out only along the bottom, nothing on the other three sides — without needing a fixed
// height. Yoga resolves the parent's size from its normal-flow children first, then sizes the
// absolutely-positioned shadow layer to match, so ordering here doesn't matter.
//
// `shadowColor` (unlike DepthButton, which has no equivalent) stays a real prop: AnswerFeedback's
// correct/incorrect/skipped ring overrides it with an opaque tint drawn where the rim peeks out
// from behind the face, so it reads as a colored ring around the whole card rather than a plain
// border line — see AnswerFeedback.tsx for that usage.
//
// `depth` and the gloss highlight now default to the exact same values as DepthButton
// (depth 4, glossOpacity 0.28, showGloss true) — before this they were quietly weaker (depth 3,
// opacity 0.12), so a DepthView card/bar read noticeably flatter than a DepthButton sitting next
// to it even though both are meant to be the same "3D plate" chrome (see QuizSessionScreen, which
// stacks a DepthView mode bar directly above two DepthButtons in the bottom bar).
import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '@my-backpack/shared';

interface DepthViewProps {
  width?: DimensionValue; // defaults to undefined — sizes to parent/style unless given
  height?: number; // defaults to undefined — auto-sizes to content unless given
  color: string;
  shadowColor?: string;

  borderRadius?: number;
  depth?: number;
  showGloss?: boolean;
  glossOpacity?: number;

  children?: ReactNode;
  style?: StyleProp<ViewStyle>; // applied to the outer (sizing) wrapper
  contentStyle?: StyleProp<ViewStyle>; // applied to the inner content layout (e.g. row + justify-between)
}

const DEFAULT_DEPTH = 4;
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.35)';
const DEFAULT_GLOSS_OPACITY = 0.28;

export function DepthView({
  width,
  height,
  color,
  shadowColor = DEFAULT_SHADOW_COLOR,
  borderRadius = radii.lg,
  depth = DEFAULT_DEPTH,
  showGloss = true,
  glossOpacity = DEFAULT_GLOSS_OPACITY,
  children,
  style,
  contentStyle,
}: DepthViewProps) {
  const glossColor = `rgba(255,255,255,${glossOpacity})`;

  return (
    <View style={[width !== undefined ? { width } : null, style]}>
      {/* Shadow layer — sized by the padWrap sibling below; shows through as the rim below the
          face. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: shadowColor, borderRadius }]} />

      {/* Normal-flow wrapper — its bottom padding is what reserves the rim, and its content is
          what gives this whole component's natural height. */}
      <View style={{ paddingBottom: depth }}>
        {/* Main face */}
        <View style={[styles.face, { backgroundColor: color, borderRadius }, height ? { height } : null]}>
          {/* Directional top highlight — the only gloss piece, same flat top-half fill DepthButton uses */}
          {showGloss && (
            <View
              pointerEvents="none"
              style={[
                styles.gloss,
                { backgroundColor: glossColor, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius },
              ]}
            />
          )}

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
  gloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
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
