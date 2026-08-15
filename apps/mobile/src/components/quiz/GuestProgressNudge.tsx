// One-time, dismissible prompt shown to a guest right after their first completed quiz
// session — tied to a genuine achievement moment rather than a timer or an every-launch
// interruption (see docs/business/monetisation.md's "no dark patterns" stance). Whether it's
// been shown before is tracked per-profile in SecureStore (hasShownGuestNudge/
// markGuestNudgeShown) by the caller (QuizSessionScreen.tsx) — this component only renders
// what it's told to and never blocks navigation; "Maybe later" and the backdrop both just
// dismiss it. See docs/technical/guest-mode.md.
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Text } from '../AppText';
import { Sparkles } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

interface GuestProgressNudgeProps {
  visible: boolean;
  onSave: () => void;
  onDismiss: () => void;
}

export function GuestProgressNudge({ visible, onSave, onDismiss }: GuestProgressNudgeProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Sparkles size={32} color={colors.warning.DEFAULT} />
          <Text style={styles.title}>Nice work!</Text>
          <Text style={styles.body}>
            You're making great progress as a guest. Save it with an email and password so it's
            never lost.
          </Text>
          <Pressable onPress={onSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save my progress</Text>
          </Pressable>
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text style={styles.laterText}>Maybe later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: colors.text.primary,
    },
    body: {
      fontSize: typography.small,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    saveButton: {
      marginTop: spacing.sm,
      width: '100%',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.primary.DEFAULT,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: '#fff',
    },
    laterText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.muted,
      marginTop: spacing.xs,
    },
  });
}
