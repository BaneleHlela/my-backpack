import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { ASSETS, colors } from '@my-backpack/shared';

interface ScreenBackgroundProps extends ViewProps {
  // Wraps children in a KeyboardAvoidingView + ScrollView — for form
  // screens (auth, profile setup) where the keyboard would otherwise
  // cover inputs. `style` becomes the scroll content container's style
  // in this mode rather than the outer background's.
  scroll?: boolean;
}

export function ScreenBackground({ scroll = false, style, children, ...rest }: ScreenBackgroundProps) {
  return (
    <ImageBackground
      source={{ uri: ASSETS.wallpapers.portrait }}
      resizeMode="cover"
      style={[styles.background, scroll ? undefined : style]}
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
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
