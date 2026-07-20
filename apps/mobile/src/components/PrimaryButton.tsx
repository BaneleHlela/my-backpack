import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';

// Mirrors apps/web's DefinitionCard "Add to bucket" button states:
// default (violet) / loading (spinner) / success (emerald, non-interactive).
interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
}: PrimaryButtonProps) {
  const isInteractive = !disabled && !loading && variant !== 'success';

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.base,
        variant === 'success' ? styles.success : styles.primary,
        pressed && variant === 'primary' ? styles.primaryPressed : null,
        disabled && variant === 'primary' ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'success' ? colors.success.dark : '#fff'} />
      ) : (
        icon
      )}
      <Text
        style={[
          styles.text,
          variant === 'success' ? styles.successText : styles.primaryText,
          disabled && variant === 'primary' ? styles.disabledText : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  primary: {
    backgroundColor: colors.primary.DEFAULT,
  },
  primaryPressed: {
    backgroundColor: colors.primary.dark,
  },
  disabled: {
    backgroundColor: colors.text.faint,
  },
  success: {
    backgroundColor: colors.success.light,
  },
  text: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  disabledText: {
    color: colors.text.secondary,
  },
  successText: {
    color: colors.success.dark,
  },
});
