// 2-column grid tile for the Mini-Apps section — channels ideal_design_example3.webp's first
// phone (a pastel 2x2 grid of activity cards: Numbers/Reading/Puzzle/Drawing). Deliberately
// flatter/pastel-er than GradientListCard's deep gradient (uses the accent's `.light` tone as a
// flat fill, not a gradient) so the two sections read as visually distinct at a glance.
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: accent.light },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: accent.DEFAULT }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={[styles.name, { color: accent.dark }]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
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
