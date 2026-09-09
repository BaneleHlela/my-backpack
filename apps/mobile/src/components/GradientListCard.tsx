// The "colorful course/subject card" primitive from the August 2026 design pass — full-width
// card with a diagonal gradient fill cycled from a small fixed accent palette
// (theme/accentPalette.ts), two soft translucent "blob" circles for a procedural
// background-pattern look (no external art asset — channels
// ideal_card_design_with_background_svg.webp / subjects_example_2.webp), a big Fredoka title,
// and an optional bottom progress row (channels subjects_example_2.webp's thin-bar-with-text
// card footer). Used by the Subject screen's course list and the Home screen's subject list —
// same component, since both are "colorful card summarizing a piece of content + its progress"
// in the same visual language.
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GradientProgressBar } from './GradientProgressBar';
import { getAccent } from '../theme/accentPalette';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

interface GradientListCardProps {
  title: string;
  subtitle?: string;
  progress?: { completed: number; total: number };
  accentIndex: number;
  onPress: () => void;
}

export function GradientListCard({ title, subtitle, progress, accentIndex, onPress }: GradientListCardProps) {
  const { colors } = useTheme();
  const accent = getAccent(colors, accentIndex);
  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <LinearGradient
        colors={[accent.light, accent.DEFAULT, accent.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={[styles.blob, styles.blobTopRight]} />
        <View pointerEvents="none" style={[styles.blob, styles.blobBottomLeft]} />

        <View style={styles.headerRow}>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.chevronBadge}>
            <ChevronRight size={18} color="#fff" />
          </View>
        </View>

        {pct !== null && (
          <View style={styles.progressRow}>
            <GradientProgressBar
              progress={pct}
              colors={['rgba(255,255,255,0.6)', '#ffffff']}
              trackColor="rgba(0,0,0,0.18)"
              height={7}
            />
            <Text style={styles.progressText}>
              {progress!.completed} of {progress!.total} complete · {pct}%
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// Not theme-dependent — every color here is either the cycled accent (passed as gradient
// `colors` above) or a fixed white/black overlay, so this is a plain module-level stylesheet
// rather than the per-theme createStyles(colors) factory the rest of the app uses.
const styles = StyleSheet.create({
    pressed: {
      opacity: 0.9,
    },
    card: {
      borderRadius: radii.lg,
      padding: spacing.md,
      overflow: 'hidden',
      minHeight: 108,
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    blob: {
      position: 'absolute',
      borderRadius: radii.full,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    blobTopRight: {
      width: 120,
      height: 120,
      top: -50,
      right: -30,
    },
    blobBottomLeft: {
      width: 90,
      height: 90,
      bottom: -40,
      left: -20,
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: fonts.display.bold,
      fontSize: typography.heading,
      color: '#fff',
    },
    subtitle: {
      fontSize: typography.small,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
    },
    chevronBadge: {
      width: 30,
      height: 30,
      borderRadius: radii.full,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressRow: {
      gap: spacing.xs,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.92)',
    },
});
