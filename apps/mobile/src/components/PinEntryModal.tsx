// Generic 4-digit PIN pad, shown whenever switching to a PIN-protected profile. Extracted out
// of app/select-profile.tsx (which originally defined this inline) so ProfileSwitcherModal can
// reuse the exact same pad without duplicating it — mirrors apps/web's already-extracted
// components/auth/PinModal.tsx.
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { radii, spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

interface PinEntryModalProps {
  profileName: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (pin: string) => void;
  onClose: () => void;
}

export function PinEntryModal({ profileName, isLoading, error, onSubmit, onClose }: PinEntryModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === 4) {
      onSubmit(pin);
      setPin('');
    }
  }, [pin, onSubmit]);

  const handleKey = (key: string) => {
    if (isLoading || !key) return;
    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((prev) => prev + key);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Enter PIN</Text>
          <Text style={styles.modalSubtitle}>PIN for {profileName}</Text>

          <View style={styles.dotsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pin.length ? styles.dotFilled : null]} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.padGrid}>
            {PAD_KEYS.map((key, idx) =>
              key ? (
                <Pressable
                  key={idx}
                  onPress={() => handleKey(key)}
                  disabled={isLoading}
                  style={styles.padKey}
                >
                  <Text style={styles.padKeyText}>{key === 'del' ? '⌫' : key}</Text>
                </Pressable>
              ) : (
                <View key={idx} style={styles.padKey} />
              )
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCard: {
      width: '85%',
      maxWidth: 340,
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.md,
    },
    modalTitle: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: colors.text.primary,
    },
    modalSubtitle: {
      fontSize: typography.small,
      color: colors.text.secondary,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: colors.text.faint,
    },
    dotFilled: {
      backgroundColor: colors.text.primary,
      borderColor: colors.text.primary,
    },
    error: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.error.dark,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    padGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%',
      justifyContent: 'space-between',
    },
    padKey: {
      width: '30%',
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    padKeyText: {
      fontSize: typography.heading,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });
}
