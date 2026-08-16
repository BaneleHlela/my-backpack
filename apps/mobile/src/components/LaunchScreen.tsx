import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { spacing, typography } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';
import { ScreenBackground } from './ScreenBackground';
import { BackpackLogo } from './BackpackLogo';
import { FloatingSparkles, type SparklePoint } from './illustrations/FloatingSparkles';

const LOGO_SPARKLES: SparklePoint[] = [
  { top: '10%', left: '15%', size: 14, color: '#fbbf24', delay: 0, duration: 1400, kind: 'star' },
  { top: '65%', left: '80%', size: 12, color: '#a78bfa', delay: 300, duration: 1600, kind: 'star' },
  { top: '75%', left: '10%', size: 10, color: '#fff', delay: 600, duration: 1500, kind: 'dot' },
  { top: '5%', left: '75%', size: 9, color: '#fff', delay: 900, duration: 1300, kind: 'dot' },
];

// The shared "loading" look — animated logo + wordmark + pulsing dots — used by every
// full-screen blocking loading state in the app (cold-start auth bootstrap, ProtectedRoute's
// isCheckingAuth/isLoadingProfile gates, the post-profile-select wait for activeProfile, Home's
// initial enrolled-subjects fetch, the Course screen's roadmap-fetch state), so they all read as
// one consistent "the app is loading" moment. Redesigned August 2026 (was a bare logo +
// ActivityIndicator) — a continuously "breathing" logo with a few looping sparkles
// (FloatingSparkles, hand-built react-native-svg + Reanimated — no external Lottie file, see
// GradientListCard.tsx's sibling design-pass notes on that choice) and a one-shot fade+slide-in
// wordmark, plus a 3-dot pulsing loader replacing the plain ActivityIndicator. Exported on its
// own (without ScreenBackground) for routes that already render inside one — see LaunchScreen
// below for the standalone version.
export function LaunchScreenBody() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.center}>
      <View style={styles.logoArea}>
        <FloatingSparkles points={LOGO_SPARKLES} />
        <BreathingLogo />
      </View>
      <Wordmark />
      <PulsingDots color={colors.primary.DEFAULT} />
    </View>
  );
}

function BreathingLogo() {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [rotate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <BackpackLogo size={80} />
    </Animated.View>
  );
}

function Wordmark() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(150, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(150, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.wordmark}>My Backpack</Text>
    </Animated.View>
  );
}

function PulsingDots({ color }: { color: string }) {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} color={color} delay={i * 180} />
      ))}
    </View>
  );
}

function Dot({ color, delay }: { color: string; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scale: 0.7 + progress.value * 0.4 }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

// Shown in place of the app's real route tree while AuthBootstrap
// (app/_layout.tsx) is still resolving — hands off from the static native
// splash image to a branded, animated screen for however long that
// network round-trip takes, instead of leaving the native splash's
// spinner-less image up with no sign of progress. Also reused by any other
// route-level loading gate that isn't already inside a ScreenBackground
// (see ProtectedRoute.tsx, profile-setup.tsx).
export function LaunchScreen() {
  return (
    <ScreenBackground>
      <LaunchScreenBody />
    </ScreenBackground>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: spacing.md,
    },
    logoArea: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wordmark: {
      fontFamily: fonts.display.bold,
      fontSize: typography.heading,
      color: colors.text.primary,
    },
  });
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
