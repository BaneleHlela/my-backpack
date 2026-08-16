// Redesigned August 2026 alongside login.tsx — see that file's module comment for the shared
// rationale (full-bleed AuthScreenBackground instead of a centered GlassCard). All register
// logic is unchanged from before this pass.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/AppText';
import { Link } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { spacing, typography } from '@my-backpack/shared';
import { AuthScreenBackground } from '../../src/components/AuthScreenBackground';
import { BackpackLogo } from '../../src/components/BackpackLogo';
import { ComingSoonOverlay } from '../../src/components/ComingSoonOverlay';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { TextField } from '../../src/components/TextField';
import { register, clearError } from '../../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../../src/store/store';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/fonts';

export default function SignupScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleRegister = async () => {
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    const result = await dispatch(register({ email, password, displayName: displayName.trim() }));
    if (register.fulfilled.match(result)) {
      setRegistered(true);
    }
  };

  const displayedError = localError ?? error;

  if (registered) {
    return (
      <AuthScreenBackground contentStyle={styles.centerContent}>
        <BackpackLogo size={44} />
        <Text style={styles.heading}>Check your inbox</Text>
        <Text style={styles.subheading}>
          We've sent a verification link to {email}. Verify your email, then sign in.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Go to sign in
        </Link>
      </AuthScreenBackground>
    );
  }

  return (
    <AuthScreenBackground contentStyle={styles.scrollContent}>
      <View style={styles.header}>
        <BackpackLogo size={44} />
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Start your learning journey today!</Text>
      </View>

      <View style={styles.form}>
        <TextField label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
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
          showToggle
          autoComplete="password-new"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry
          showToggle
        />

        {displayedError ? <Text style={styles.error}>{displayedError}</Text> : null}

        <PrimaryButton
          title="Create account"
          onPress={() => void handleRegister()}
          loading={isLoading}
          disabled={!displayName || !email || !password || !confirmPassword}
        />
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <Pressable style={styles.socialButton} onPress={() => setComingSoon('Google sign-up')}>
          <Text style={styles.socialButtonText}>🔍 Google</Text>
        </Pressable>
        <Pressable style={styles.socialButton} onPress={() => setComingSoon('Facebook sign-up')}>
          <Text style={styles.socialButtonText}>📘 Facebook</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Sign in
        </Link>
      </View>

      {comingSoon && <ComingSoonOverlay label={comingSoon} onDismiss={() => setComingSoon(null)} />}
    </AuthScreenBackground>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    centerContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    heading: {
      fontFamily: fonts.display.bold,
      fontSize: typography.headingLg + 6,
      color: colors.text.primary,
      marginTop: spacing.sm,
    },
    subheading: {
      fontSize: typography.body,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    form: {
      gap: spacing.md,
    },
    error: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.error.dark,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.surface.border,
    },
    dividerText: {
      fontSize: typography.small,
      color: colors.text.muted,
    },
    socialRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    socialButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surface.border,
      backgroundColor: colors.surface.glass,
    },
    socialButtonText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.primary,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    footerText: {
      fontSize: typography.small,
      color: colors.text.secondary,
    },
    link: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.primary.darker,
    },
  });
}
