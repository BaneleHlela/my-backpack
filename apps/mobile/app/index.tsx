import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../src/components/GlassCard';
import { ScreenBackground } from '../src/components/ScreenBackground';

// Phase 1 smoke-test placeholder, proving the scaffold/theme/primitives
// compose correctly. Replaced by real auth-guard routing in Phase 3.
export default function Index() {
  return (
    <ScreenBackground style={styles.center}>
      <GlassCard>
        <Text style={styles.heading}>My Backpack</Text>
        <Text style={styles.body}>Everything you need to learn, in one place.</Text>
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
  heading: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: typography.body,
    color: colors.text.secondary,
  },
});
