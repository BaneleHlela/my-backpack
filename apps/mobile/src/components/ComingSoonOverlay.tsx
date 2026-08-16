// A small dismissible "X coming soon" overlay — extracted from CourseScreen.tsx's inline
// `comingSoon` pattern (August 2026 design pass) so the auth/profile screens' new OAuth
// placeholder buttons and the select-profile "+ Add profile" tile can reuse the exact same
// affordance instead of each screen rolling its own toast. Tap anywhere to dismiss.
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { radii, spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

interface ComingSoonOverlayProps {
  label: string;
  onDismiss: () => void;
}

export function ComingSoonOverlay({ label, onDismiss }: ComingSoonOverlayProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.overlay} onPress={onDismiss}>
      <View style={styles.card}>
        <Text style={styles.text}>{label} coming soon.</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    text: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });
}
