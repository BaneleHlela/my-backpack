// 2-column grid tile for the Mini-Apps section — channels ideal_design_example3.webp's first
// phone (a pastel 2x2 grid of activity cards: Numbers/Reading/Puzzle/Drawing). Deliberately
// flatter/pastel-er than GradientListCard's deep gradient (uses the accent's `.light` tone as a
// flat fill, not a gradient) so the two sections read as visually distinct at a glance.
// Built on PaddedButton (./PaddedButton.tsx) — a fixed aspect-3/4 (portrait) card shape with a
// dashed border and a small padding gap, i.e. Scribbler.tsx's `border-2 border-dashed ... p-2`
// picture-frame effect reproduced 1:1 (`padding={2}`, `borderWidth={2}`, `borderStyle="dashed"`).
// Colors cycle from the shared theme/accentPalette.ts palette, same as QuizPickerModal.tsx's
// quiz rows — see ideal_design_example1.webp's first phone screen for the varying-flat-color
// reference both now follow, so a color never has to be picked twice.
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { PaddedButton } from './PaddedButton';
import { radii, spacing, typography } from '@my-backpack/shared';
import { getAccent } from '../theme/accentPalette';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

interface MiniAppGridCardProps {
  name: string;
  emoji: string;
  accentIndex: number;
  onPress: () => void;
}

export function MiniAppGridCard({ name, emoji, accentIndex, onPress }: MiniAppGridCardProps) {
  const { colors } = useTheme();
  const accent = getAccent(colors, accentIndex);

  return (
    <PaddedButton
      width="48%"
      aspectRatio={3 / 4}
      color={accent.light}
      borderColor={accent.dark}
      borderWidth={2}
      borderStyle="dashed"
      padding={2}
      borderRadius={radii.lg}
      onPress={onPress}
      contentStyle={styles.content}
    >
      <View style={[styles.iconBadge, { backgroundColor: accent.DEFAULT }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      {/* Always the theme's primary text tone (near-black in light mode, near-white in dark
          mode) — never the per-accent `accent.dark` — so card text stays legible regardless of
          which accent tone this card landed on (some accents' `.light` fill is itself a deep
          900-level color in dark mode, not a pale pastel, which `accent.dark` text wouldn't
          contrast against). */}
      <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={2}>
        {name}
      </Text>
    </PaddedButton>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: typography.heading,
  },
  name: {
    fontFamily: fonts.display.semibold,
    fontSize: typography.body,
  },
});
