// Redesigned August 2026 (design pass: "don't limit auth content to the small glossy
// background div at the centre") — full-bleed layout, content sits directly on the background
// instead of inside a centered GlassCard. Background is a code-drawn gradient wash +
// FloatingBlobs/FloatingSparkles rather than ScreenBackground's wallpaper images (still
// unpopulated placeholders — see assets.ts). All auth logic (login/continueAsGuest thunks) is
// unchanged from before this pass.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/AppText';
import { Link, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { spacing, typography } from '@my-backpack/shared';
import { AuthScreenBackground } from '../../src/components/AuthScreenBackground';
import { BackpackLogo } from '../../src/components/BackpackLogo';
import { ComingSoonOverlay } from '../../src/components/ComingSoonOverlay';
import { FacebookIcon } from '../../src/components/icons/FacebookIcon';
import { GoogleIcon } from '../../src/components/icons/GoogleIcon';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { TextField } from '../../src/components/TextField';
import { login, continueAsGuest, fetchActiveProfile, clearError } from '../../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../../src/store/store';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/fonts';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);

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

  // "Continue as guest" — a real Account + Profile with no email/password, created and
  // signed into in one call. No /select-profile hop: continueAsGuest already returns a full
  // access token, so this goes straight from tap to Home. fetchActiveProfile is a second
  // round trip because the guest-signup response only carries a ProfileSummary (not the full
  // IProfile state.activeProfile needs) — same two-step shape doSelectAndNavigate already uses
  // elsewhere (select-profile.tsx, ProfileSwitcherModal.tsx). See docs/technical/guest-mode.md.
  const handleGuest = async () => {
    dispatch(clearError());
    setIsGuestLoading(true);
    const result = await dispatch(continueAsGuest(undefined));
    if (continueAsGuest.fulfilled.match(result)) {
      await dispatch(fetchActiveProfile());
      router.replace('/(app)/home');
    }
    setIsGuestLoading(false);
  };

  return (
    <AuthScreenBackground contentStyle={styles.scrollContent}>
      <View style={styles.header}>
        <BackpackLogo size={44} />
        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.subheading}>It's a great pleasure to have you. Let's keep learning!</Text>
      </View>

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
          showToggle
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

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <Pressable style={styles.socialButton} onPress={() => setComingSoon('Google sign-in')}>
          <GoogleIcon size={18} />
          <Text style={styles.socialButtonText}>Google</Text>
        </Pressable>
        <Pressable style={styles.socialButton} onPress={() => setComingSoon('Facebook sign-in')}>
          <FacebookIcon size={18} />
          <Text style={styles.socialButtonText}>Facebook</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/(auth)/signup" style={styles.link}>
          Sign up
        </Link>
      </View>

      <Pressable onPress={() => void handleGuest()} disabled={isGuestLoading} style={styles.guestRow} hitSlop={8}>
        {isGuestLoading ? (
          <ActivityIndicator size="small" color={colors.text.secondary} />
        ) : (
          <Text style={styles.guestText}>Continue as guest</Text>
        )}
      </Pressable>

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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
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
      color: colors.text.secondary,
      textDecorationLine: 'underline',
    },
    // Visually secondary to "Sign in" — this is the fast path, not the primary one, so it
    // reads as a plain text link rather than a second button competing for attention.
    guestRow: {
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    guestText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.muted,
      textDecorationLine: 'underline',
    },
  });
}
