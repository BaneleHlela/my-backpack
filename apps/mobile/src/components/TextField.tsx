import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './AppText';
import { Eye, EyeOff } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // Opt-in eye icon that toggles `secureTextEntry` locally — off by default, so every existing
  // `secureTextEntry` caller is unaffected unless it opts in. Added for the auth screens'
  // password fields (design pass, August 2026).
  showToggle?: boolean;
}

export function TextField({ label, error, style, showToggle = false, secureTextEntry, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [revealed, setRevealed] = useState(false);
  const isToggleable = showToggle && secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isToggleable && styles.inputWithIcon, error ? styles.inputError : null, style]}
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          secureTextEntry={isToggleable ? !revealed : secureTextEntry}
          {...rest}
        />
        {isToggleable ? (
          <Pressable onPress={() => setRevealed((v) => !v)} style={styles.eyeButton} hitSlop={8}>
            {revealed ? (
              <EyeOff size={20} color={colors.text.muted} />
            ) : (
              <Eye size={20} color={colors.text.muted} />
            )}
          </Pressable>
        ) : null}
      </View>
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
    inputRow: {
      justifyContent: 'center',
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
    inputWithIcon: {
      paddingRight: spacing.xl,
    },
    inputError: {
      borderColor: colors.error.DEFAULT,
    },
    eyeButton: {
      position: 'absolute',
      right: spacing.sm,
    },
    error: {
      fontSize: typography.small,
      color: colors.error.dark,
    },
  });
}
