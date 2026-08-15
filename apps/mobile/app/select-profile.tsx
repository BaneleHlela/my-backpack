import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { ProfileSummary } from '@my-backpack/shared';
import { GlassCard } from '../src/components/GlassCard';
import { PinEntryModal } from '../src/components/PinEntryModal';
import { ScreenBackground } from '../src/components/ScreenBackground';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { selectProfile, fetchActiveProfile, logoutAsync, clearError } from '../src/features/auth/authSlice';
import { getLastRoute } from '../src/lib/secureStore';
import type { AppDispatch, RootState } from '../src/store/store';
import { useTheme } from '../src/theme/ThemeContext';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function getAgeGroupStyles(colors: ThemeColors): Record<string, { bg: string; text: string }> {
  return {
    child: { bg: colors.warning.light, text: colors.warning.dark },
    teen: { bg: colors.primary.light, text: colors.primary.darker },
    adult: { bg: colors.success.light, text: colors.success.dark },
  };
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProfileTile({ profile, onPress }: { profile: ProfileSummary; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const ageGroupStyles = getAgeGroupStyles(colors);
  const ageStyle = ageGroupStyles[profile.ageGroup] ?? { bg: colors.surface.glass, text: colors.text.secondary };
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(profile.displayName)}</Text>
        {profile.hasPin ? <View style={styles.pinBadge} /> : null}
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {profile.displayName}
      </Text>
      <View style={[styles.ageBadge, { backgroundColor: ageStyle.bg }]}>
        <Text style={[styles.ageBadgeText, { color: ageStyle.text }]}>{profile.ageGroup}</Text>
      </View>
    </Pressable>
  );
}

function SelectProfileScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [pendingProfile, setPendingProfile] = useState<ProfileSummary | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { profiles, error, isLoading } = useSelector((state: RootState) => state.auth);

  const doSelectAndNavigate = async (profileId: string, pin?: string) => {
    const result = await dispatch(selectProfile({ profileId, pin }));
    if (!selectProfile.fulfilled.match(result)) return;

    const profileResult = await dispatch(fetchActiveProfile());
    if (fetchActiveProfile.fulfilled.match(profileResult)) {
      if (!profileResult.payload.isSetupComplete) {
        router.replace('/profile-setup');
        return;
      }
      const lastRoute = await getLastRoute(profileResult.payload._id);
      router.replace(lastRoute ?? '/(app)/home');
    }
  };

  const handleProfilePress = (profile: ProfileSummary) => {
    dispatch(clearError());
    if (profile.hasPin) {
      setPendingProfile(profile);
      setPinError(null);
    } else {
      void doSelectAndNavigate(profile.id);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingProfile) return;
    setPinError(null);
    const result = await dispatch(selectProfile({ profileId: pendingProfile.id, pin }));
    if (selectProfile.rejected.match(result)) {
      setPinError(result.payload as string);
      return;
    }
    setPendingProfile(null);
    await doSelectAndNavigate(pendingProfile.id, pin);
  };

  return (
    <ScreenBackground style={styles.center}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Who's learning today?</Text>
            <Text style={styles.subheading}>Select a profile to continue</Text>
          </View>
          <Pressable onPress={() => dispatch(logoutAsync())}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.grid}>
          {profiles.map((profile) => (
            <ProfileTile key={profile.id} profile={profile} onPress={() => handleProfilePress(profile)} />
          ))}
        </View>
      </GlassCard>

      {pendingProfile ? (
        <PinEntryModal
          profileName={pendingProfile.displayName}
          isLoading={isLoading}
          error={pinError}
          onSubmit={(pin) => void handlePinSubmit(pin)}
          onClose={() => {
            setPendingProfile(null);
            setPinError(null);
          }}
        />
      ) : null}
    </ScreenBackground>
  );
}

export default function SelectProfileRoute() {
  return (
    <ProtectedRoute requireFullToken={false}>
      <SelectProfileScreen />
    </ProtectedRoute>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 480,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    heading: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: colors.text.primary,
    },
    subheading: {
      fontSize: typography.small,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    signOut: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    tile: {
      width: '30%',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.secondary,
    },
    pinBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: radii.full,
      backgroundColor: colors.text.primary,
    },
    tileName: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.primary,
      maxWidth: '100%',
    },
    ageBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    ageBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    error: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.error.dark,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
  });
}
