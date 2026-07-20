import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../../src/components/GlassCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenBackground } from '../../src/components/ScreenBackground';
import { TextField } from '../../src/components/TextField';
import { register, clearError } from '../../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../../src/store/store';

export default function SignupScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

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
      <ScreenBackground style={styles.center}>
        <GlassCard style={styles.card}>
          <Text style={styles.heading}>Check your inbox</Text>
          <Text style={styles.subheading}>
            We've sent a verification link to {email}. Verify your email, then sign in.
          </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Go to sign in
          </Link>
        </GlassCard>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground scroll style={styles.center}>
      <GlassCard style={styles.card}>
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Start your learning journey today!</Text>

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
            title="Create account"
            onPress={() => void handleRegister()}
            loading={isLoading}
            disabled={!displayName || !email || !password || !confirmPassword}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </GlassCard>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
  heading: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subheading: {
    fontSize: typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.error.dark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
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
