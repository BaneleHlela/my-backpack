import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../../src/components/GlassCard';
import { logoutAsync } from '../../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../../src/store/store';

// Phase 3 placeholder, proving the guarded (app) route tree works
// end-to-end. Replaced by the real content-driven Home screen in Phase 4.
export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);

  return (
    <View style={styles.center}>
      <GlassCard>
        <Text style={styles.heading}>Hey{activeProfile ? `, ${activeProfile.displayName}` : ''}! 🎒</Text>
        <Text style={styles.body}>You're signed in. The real Home screen lands in Phase 4.</Text>
        <Pressable onPress={() => dispatch(logoutAsync())} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
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
  signOut: {
    marginTop: spacing.lg,
  },
  signOutText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});
