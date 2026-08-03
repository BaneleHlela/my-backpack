import { View, StyleSheet, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { radii, spacing } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

interface GlassCardProps extends ViewProps {
  intensity?: 'soft' | 'default' | 'strong';
}

export function GlassCard({ intensity = 'default', style, children, ...rest }: GlassCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const fill = {
    soft: colors.surface.glassSoft,
    default: colors.surface.glass,
    strong: colors.surface.glassStrong,
  }[intensity];

  return (
    <View style={[styles.wrapper, { backgroundColor: fill }, style]} {...rest}>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surface.border,
      overflow: 'hidden',
    },
    content: { padding: spacing.md },
  });
}
