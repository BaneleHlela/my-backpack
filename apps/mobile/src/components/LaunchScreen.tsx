import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';
import { ScreenBackground } from './ScreenBackground';
import { BackpackLogo } from './BackpackLogo';

// The shared "loading" look — logo centered, spinner underneath — used by
// every full-screen blocking loading state in the app (cold-start auth
// bootstrap, ProtectedRoute's isCheckingAuth/isLoadingProfile gates, the
// post-profile-select wait for activeProfile, Home's initial enrolled-subjects
// fetch), so they all read as one consistent "the app is loading" moment
// instead of a mix of bare spinners and blank screens. Exported on its own
// (without ScreenBackground) for routes that already render inside one —
// see LaunchScreen below for the standalone version.
export function LaunchScreenBody() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.center}>
      <BackpackLogo size={72} />
      <ActivityIndicator size="large" color={colors.primary.DEFAULT} style={styles.spinner} />
    </View>
  );
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
    },
    spinner: {
      marginTop: spacing.xl,
    },
  });
}
