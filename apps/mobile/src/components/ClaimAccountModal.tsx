// Lightweight, single-purpose modal for a guest to add an email + password to their existing
// account — mirrors PinEntryModal.tsx's pattern (focused, centered Modal, not a full route).
// Reachable from two places: ProfileSwitcherModal's "Save your progress" row, and
// GuestProgressNudge after a guest's first completed quiz session — both just render this with
// visible={true}. Same account, same profiles, same progress: POST /api/auth/claim only adds
// credentials to the account already in use, so there's no logout/re-login on success (see the
// claimAccount thunk in authSlice.ts). See docs/technical/guest-mode.md.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { useDispatch, useSelector } from 'react-redux';
import { radii, spacing, typography } from '@my-backpack/shared';
import { PrimaryButton } from './PrimaryButton';
import { TextField } from './TextField';
import { claimAccount, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../store/store';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

interface ClaimAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ClaimAccountModal({ visible, onClose }: ClaimAccountModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, successMessage } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetAndClose = () => {
    dispatch(clearError());
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
    setDone(false);
    onClose();
  };

  const handleSubmit = async () => {
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    const result = await dispatch(claimAccount({ email, password }));
    if (claimAccount.fulfilled.match(result)) {
      setDone(true);
    }
  };

  const displayedError = localError ?? error;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={resetAndClose}>
      <Pressable style={styles.overlay} onPress={resetAndClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {done ? (
            <>
              <Text style={styles.title}>You're all set!</Text>
              <Text style={styles.body}>{successMessage ?? 'Your progress is now saved.'}</Text>
              <PrimaryButton title="Done" onPress={resetAndClose} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Save your progress</Text>
              <Text style={styles.body}>
                Add an email and password — everything you've done stays exactly as it is.
              </Text>

              <View style={styles.form}>
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (min. 8 characters)"
                  secureTextEntry
                  autoComplete="password-new"
                />
                <TextField
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  secureTextEntry
                />

                {displayedError ? <Text style={styles.error}>{displayedError}</Text> : null}

                <PrimaryButton
                  title="Save progress"
                  onPress={() => void handleSubmit()}
                  loading={isLoading}
                  disabled={!email || !password || !confirmPassword}
                />
              </View>

              <Pressable onPress={resetAndClose} hitSlop={8}>
                <Text style={styles.cancelText}>Not now</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
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
      maxWidth: 380,
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      fontFamily: fonts.display.bold,
      fontSize: typography.heading,
      color: colors.text.primary,
      textAlign: 'center',
    },
    body: {
      fontSize: typography.small,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    form: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    error: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.error.dark,
    },
    cancelText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
}
