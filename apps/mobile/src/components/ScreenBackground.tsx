import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { ASSETS } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

interface ScreenBackgroundProps extends ViewProps {
  // Wraps children in a KeyboardAvoidingView + ScrollView — for form
  // screens (auth, profile setup) where the keyboard would otherwise
  // cover inputs. `style` becomes the scroll content container's style
  // in this mode rather than the outer background's.
  scroll?: boolean;
}

export function ScreenBackground({ scroll = false, style, children, ...rest }: ScreenBackgroundProps) {
  const { theme, colors } = useTheme();
  const wallpaperUri = theme === 'dark' ? ASSETS.wallpapers.portraitDark : ASSETS.wallpapers.portraitLight;

  return (
    <ImageBackground
      source={{ uri: wallpaperUri }}
      resizeMode="cover"
      style={[styles.background, { backgroundColor: colors.background }, scroll ? undefined : style]}
      {...rest}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
