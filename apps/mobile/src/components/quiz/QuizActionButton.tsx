import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { Text } from '../AppText';
import { useTheme } from '../../theme/ThemeContext';

interface QuizActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Flat quiz controls. Flex sizing and a minimum height also accommodate larger text. */
export function QuizActionButton({
  label,
  onPress,
  disabled,
  loading,
  secondary,
  icon,
  style,
}: QuizActionButtonProps) {
  const { colors } = useTheme();
  const unavailable = disabled || loading;
  const foreground = secondary ? colors.text.primary : '#fff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(unavailable), busy: Boolean(loading) }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.background : colors.primary.dark,
          borderColor: secondary ? colors.text.faint : colors.primary.dark,
        },
        style,
        pressed && styles.pressed,
        unavailable && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : icon}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  label: { flexShrink: 1, fontSize: typography.body, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
