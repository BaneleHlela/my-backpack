import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { ProfileSummary } from '@my-backpack/shared';
import { GlassCard } from '../src/components/GlassCard';
import { ScreenBackground } from '../src/components/ScreenBackground';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { selectProfile, fetchActiveProfile, logoutAsync, clearError } from '../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../src/store/store';

const AGE_GROUP_STYLES: Record<string, { bg: string; text: string }> = {
  child: { bg: colors.warning.light, text: colors.warning.dark },
  teen: { bg: colors.primary.light, text: colors.primary.darker },
  adult: { bg: colors.success.light, text: colors.success.dark },
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProfileTile({ profile, onPress }: { profile: ProfileSummary; onPress: () => void }) {
  const ageStyle = AGE_GROUP_STYLES[profile.ageGroup] ?? { bg: colors.surface.glass, text: colors.text.secondary };
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

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

function PinEntryModal({
  profileName,
  isLoading,
  error,
  onSubmit,
  onClose,
}: {
  profileName: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (pin: string) => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === 4) {
      onSubmit(pin);
      setPin('');
    }
  }, [pin, onSubmit]);

  const handleKey = (key: string) => {
    if (isLoading || !key) return;
    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((prev) => prev + key);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Enter PIN</Text>
          <Text style={styles.modalSubtitle}>PIN for {profileName}</Text>

          <View style={styles.dotsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pin.length ? styles.dotFilled : null]} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.padGrid}>
            {PAD_KEYS.map((key, idx) =>
              key ? (
                <Pressable
                  key={idx}
                  onPress={() => handleKey(key)}
                  disabled={isLoading}
                  style={styles.padKey}
                >
                  <Text style={styles.padKeyText}>{key === 'del' ? '⌫' : key}</Text>
                </Pressable>
              ) : (
                <View key={idx} style={styles.padKey} />
              )
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectProfileScreen() {
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
      router.replace(profileResult.payload.isSetupComplete ? '/(app)/home' : '/profile-setup');
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

const styles = StyleSheet.create({
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
    backgroundColor: '#fff',
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
    paddingHorizontal: spacing.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.text.faint,
  },
  dotFilled: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  padGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-between',
  },
  padKey: {
    width: '30%',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.glassSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyText: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
