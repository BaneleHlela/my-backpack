import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../../src/components/GlassCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenBackground } from '../../src/components/ScreenBackground';
import { TextField } from '../../src/components/TextField';
import { login, clearError } from '../../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../../src/store/store';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = async () => {
    setUnverifiedEmail(null);
    dispatch(clearError());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      router.replace('/select-profile');
    } else if (login.rejected.match(result)) {
      const payload = result.payload as { needsVerification?: boolean; email?: string } | string;
      if (typeof payload === 'object' && payload?.needsVerification) {
        setUnverifiedEmail(payload.email ?? email);
      }
    }
  };

  return (
    <ScreenBackground scroll style={styles.center}>
      <GlassCard style={styles.card}>
        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.subheading}>It's a great pleasure to have you. Let's keep learning!</Text>

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
            placeholder="Password"
            secureTextEntry
            autoComplete="password"
          />

          {unverifiedEmail ? (
            <Text style={styles.error}>
              Please verify your email before signing in — check the inbox for {unverifiedEmail}.
            </Text>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <PrimaryButton
            title="Sign in"
            onPress={() => void handleLogin()}
            loading={isLoading}
            disabled={!email || !password}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" style={styles.link}>
            Sign up
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
