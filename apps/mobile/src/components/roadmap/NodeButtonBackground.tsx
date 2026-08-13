// Thin wrapper around the bundled Kenney "button_round_depth_gloss" SVG (Kenney UI Pack,
// Vector/Grey variant — assets/images/roadmap/button_round_depth_gloss.svg, imported as a React
// component via react-native-svg-transformer, see metro.config.js). Grey was picked as the base
// over the pack's own hue-matched variants (Red/Blue/etc.) because its border/gloss/shadow tones
// are neutral, so they read correctly under any accent color swapped in via `fill` below — not
// just the one hue the source variant shipped with.
//
// Only the button's main face is recolorable. The source .svg has 4 fill paths (outer border
// ring, top gloss highlight, bottom-rim shadow, main face) — every one of them keeps its
// original literal hex except the main face, which was hand-edited from `#DADCE7` to
// `fill="currentColor"`. react-native-svg resolves `currentColor` against the nearest ancestor's
// `color` prop (see extractBrush.ts in react-native-svg), so passing `color` into the generated
// component recolors only that one path — the other 3 fills never become props, per NodeButton's
// design ("don't turn every fill into a configurable color"). This wrapper exposes that as `fill`
// (matching the theme color callers already have — colors.error.DEFAULT / colors.primary.DEFAULT)
// so NodeButton doesn't need to know the currentColor mechanism is involved.
import ButtonRoundDepthGloss from '../../../assets/images/roadmap/button_round_depth_gloss.svg';

interface NodeButtonBackgroundProps {
  width: number;
  height: number;
  fill: string;
}

export default function NodeButtonBackground({ width, height, fill }: NodeButtonBackgroundProps) {
  return <ButtonRoundDepthGloss width={width} height={height} color={fill} />;
}
