// Shared full-bleed background for the pre-app screens (login, signup, select-profile,
// profile-setup) — August 2026 design pass: "don't limit auth/profile content to the small
// glossy background div at the centre." Composes ScreenBackground (non-scroll mode) with a
// code-drawn gradient wash + FloatingBlobs/FloatingSparkles as fixed decoration, then a local
// KeyboardAvoidingView + ScrollView for the actual content — deliberately NOT using
// ScreenBackground's own `scroll` prop, since that would put the gradient/blobs *inside* the
// scrollable content instead of behind it as a fixed layer (the same problem ScreenBackground's
// own `backgroundIcon` decoration avoids by rendering as a sibling of its ScrollView, not a
// child of it — this component follows that same pattern one level up).
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingBlobs } from './illustrations/FloatingBlobs';
import { FloatingSparkles } from './illustrations/FloatingSparkles';
import { AUTH_BLOBS, AUTH_SPARKLES } from './illustrations/authDecoration';
import { ScreenBackground } from './ScreenBackground';
import { useTheme } from '../theme/ThemeContext';

interface AuthScreenBackgroundProps {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AuthScreenBackground({ children, contentStyle }: AuthScreenBackgroundProps) {
  const { colors } = useTheme();

  return (
    <ScreenBackground style={styles.fill}>
      <LinearGradient
        colors={[colors.background, colors.primary.dark]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FloatingBlobs blobs={AUTH_BLOBS} />
      <FloatingSparkles points={AUTH_SPARKLES} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
