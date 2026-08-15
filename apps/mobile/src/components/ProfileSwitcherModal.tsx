// The dropdown menu opened by tapping Menubar's avatar — ports apps/web's
// components/nav/ProfileSwitcher.tsx dropdown content (current profile, other profiles to
// switch to, Add Profile, Sign out) as a centered Modal instead of an absolutely-positioned
// dropdown, since RN has no hover/click-outside primitive to anchor one under the avatar —
// tapping the backdrop closes it, the same dismiss gesture web's click-outside-listener gives.
//
// One deliberate improvement over web: after switching profiles, web's ProfileSwitcher
// navigates straight to '/dashboard' without ever re-fetching the new profile, so its own
// TopNav avatar/name go stale until something else happens to refetch it. This follows
// select-profile.tsx's fuller flow instead (selectProfile -> fetchActiveProfile -> resume
// that profile's last route, or /profile-setup if it's not finished setup) — the correct
// version already established on this screen, and the only way Menubar's own avatar ends up
// showing the newly-active profile right away.
//
// "+ Add Profile" mirrors web's ProfileSwitcher exactly, including its current limitation:
// it navigates to /select-profile, which only ever lists the profiles already returned by
// login's partial-token response — there's no "create a new profile" form yet on either
// platform (see root CLAUDE.md's "Profile management screens" — unbuilt on both), and since
// this app already holds a full access token at this point, ProtectedRoute's own
// requireFullToken:false guard immediately bounces straight back to /(app)/home. Not fixed
// here — same gap as web, not something this pass is scoped to solve.
//
// "Save your progress" (August 2026, guest mode — see docs/technical/guest-mode.md) only
// renders when the active profile is a guest (Account.isGuest, threaded down through
// activeProfile.isGuest). Opens ClaimAccountModal, which adds email/password credentials to
// the same account already in use — no logout, no new profile, no re-login.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Lock, LogOut, Save, UserPlus } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { ProfileSummary } from '@my-backpack/shared';
import { Avatar } from './Avatar';
import { ClaimAccountModal } from './ClaimAccountModal';
import { PinEntryModal } from './PinEntryModal';
import { selectProfile, fetchActiveProfile, logoutAsync, clearError } from '../features/auth/authSlice';
import { getLastRoute } from '../lib/secureStore';
import type { AppDispatch, RootState } from '../store/store';
import { useTheme } from '../theme/ThemeContext';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

interface ProfileSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSwitcherModal({ visible, onClose }: ProfileSwitcherModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { activeProfile, profiles, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [pendingProfile, setPendingProfile] = useState<ProfileSummary | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  if (!activeProfile) return null;

  const otherProfiles = profiles.filter((p) => p.id !== activeProfile._id);

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

  const handleSwitch = (profile: ProfileSummary) => {
    dispatch(clearError());
    if (profile.hasPin) {
      setPendingProfile(profile);
      setPinError(null);
      return;
    }
    onClose();
    void doSelectAndNavigate(profile.id);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingProfile) return;
    setPinError(null);
    const result = await dispatch(selectProfile({ profileId: pendingProfile.id, pin }));
    if (selectProfile.rejected.match(result)) {
      setPinError(result.payload as string);
      return;
    }
    const profile = pendingProfile;
    setPendingProfile(null);
    onClose();
    await doSelectAndNavigate(profile.id, pin);
  };

  const handleAddProfile = () => {
    onClose();
    router.push('/select-profile');
  };

  const handleSaveProgress = () => {
    onClose();
    setClaimModalOpen(true);
  };

  const handleSignOut = () => {
    onClose();
    void dispatch(logoutAsync());
  };

  return (
    <>
      <Modal transparent animationType="fade" visible={visible && !pendingProfile} onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.currentRow}>
              <Avatar
                displayName={activeProfile.displayName}
                ageGroup={activeProfile.ageGroup}
                avatarUrl={activeProfile.avatarUrl}
                size={36}
              />
              <Text style={styles.currentName} numberOfLines={1}>
                {activeProfile.displayName}
              </Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {otherProfiles.length > 0 ? (
              <>
                <View style={styles.divider} />
                {otherProfiles.map((profile) => (
                  <Pressable
                    key={profile.id}
                    onPress={() => handleSwitch(profile)}
                    style={styles.row}
                    disabled={isLoading}
                  >
                    <Avatar
                      displayName={profile.displayName}
                      ageGroup={profile.ageGroup}
                      avatarUrl={profile.avatarUrl}
                      size={32}
                    />
                    <Text style={styles.rowText} numberOfLines={1}>
                      {profile.displayName}
                    </Text>
                    {profile.hasPin ? <Lock size={14} color={colors.text.muted} /> : null}
                  </Pressable>
                ))}
              </>
            ) : null}

            {activeProfile.isGuest ? (
              <>
                <View style={styles.divider} />
                <Pressable onPress={handleSaveProgress} style={styles.row}>
                  <View style={styles.iconSlot}>
                    <Save size={18} color={colors.text.secondary} />
                  </View>
                  <Text style={styles.rowText}>Save your progress</Text>
                </Pressable>
              </>
            ) : null}

            <View style={styles.divider} />
            <Pressable onPress={handleAddProfile} style={styles.row}>
              <View style={styles.iconSlot}>
                <UserPlus size={18} color={colors.text.secondary} />
              </View>
              <Text style={styles.rowText}>Add Profile</Text>
            </Pressable>

            <View style={styles.divider} />
            <Pressable onPress={handleSignOut} style={styles.row}>
              <View style={styles.iconSlot}>
                <LogOut size={18} color={colors.error.DEFAULT} />
              </View>
              <Text style={[styles.rowText, styles.signOutText]}>Sign out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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

      <ClaimAccountModal visible={claimModalOpen} onClose={() => setClaimModalOpen(false)} />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'flex-end',
      padding: spacing.md,
    },
    card: {
      width: 240,
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      paddingVertical: spacing.xs,
      overflow: 'hidden',
    },
    currentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface.glassSoft,
    },
    currentName: {
      flex: 1,
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.surface.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowText: {
      flex: 1,
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.text.primary,
    },
    signOutText: {
      color: colors.error.DEFAULT,
    },
    iconSlot: {
      width: 32,
      alignItems: 'center',
    },
    error: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.error.dark,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
  });
}
