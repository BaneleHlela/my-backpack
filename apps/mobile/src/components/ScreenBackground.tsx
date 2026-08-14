import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSETS } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '@my-backpack/shared';

interface ScreenBackgroundProps extends ViewProps {
  // Wraps children in a KeyboardAvoidingView + ScrollView — for form
  // screens (auth, profile setup) where the keyboard would otherwise
  // cover inputs. `style` becomes the scroll content container's style
  // in this mode rather than the outer background's.
  scroll?: boolean;
}

// This is the single shared per-screen wrapper — every route under (app) (via its layout's
// <Slot/>), the auth screens, select-profile, profile-setup, and QuizModeSelectScreen all render
// through it — so insetting content here is what keeps the whole app's UI clear of the phone's
// status bar and (on Android, edge-to-edge by default) nav/gesture bar, without every individual
// screen having to manage insets itself. Anything absolutely-positioned inside a screen (e.g.
// CoursePathActions' FABs) is still positioned relative to this already-inset box, so it lines up
// correctly above the nav bar for free. The wallpaper itself intentionally stays full-bleed
// behind the inset content — a background image showing through the status bar/nav bar is the
// normal look for this kind of screen, only interactive/readable content needs to avoid them.
// (One screen renders outside this wrapper entirely — QuizSessionScreen, a root-level
// fullScreenModal route — and insets itself the same way directly.)
export function ScreenBackground({ scroll = false, style, children, ...rest }: ScreenBackgroundProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wallpaperUri = theme === 'dark' ? ASSETS.wallpapers.portraitDark : ASSETS.wallpapers.portraitLight;

  return (
    <ImageBackground
      source={{ uri: wallpaperUri }}
      resizeMode="cover"
      style={[styles.background, { backgroundColor: colors.background }]}
      {...rest}
    >
      <View
        style={[styles.safeArea, { 
          paddingTop: insets.top, 
          paddingBottom: insets.bottom,
          paddingHorizontal: spacing.xs,
         }, scroll ? undefined : style]}
      >
        {scroll ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={[styles.scrollContent, style]} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          children
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
