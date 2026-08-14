import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.text.muted}
        autoCapitalize="none"
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.xs,
    },
    label: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    input: {
      backgroundColor: colors.surface.glass,
      borderWidth: 1,
      borderColor: colors.surface.border,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      fontSize: typography.body,
      color: colors.text.primary,
    },
    inputError: {
      borderColor: colors.error.DEFAULT,
    },
    error: {
      fontSize: typography.small,
      color: colors.error.dark,
    },
  });
}
