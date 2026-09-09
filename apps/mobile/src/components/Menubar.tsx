// Shared top bar for every screen that previously rolled its own back-button row. Ports Figma's
// "Menubar" component (file OaE5PxSOT5p8Fby7SUpoP7, node 22:27039's Stack > Menubar — pulled
// during the Course & Topic redesign research): a back chevron + caps label on the left, and a
// Peanuts / XP / profile-avatar cluster on the right.
//
// Peanuts and XP are shown as fixed placeholders (not wired to real data) — the reward system
// exists in the data model but the service layer isn't built yet (see root CLAUDE.md's "XP and
// peanuts reward system" note), so there is nothing real to display yet. The profile avatar IS
// functional — tapping it opens `ProfileSwitcherModal`, this app's port of apps/web's
// `ProfileSwitcher.tsx` (switch profile / add profile / sign out), and shows a real DiceBear
// image (see `Avatar`/`lib/avatar.ts`) instead of a plain initials circle.
//
// `label`/`onBackPress` are optional so a screen with no natural "back" destination (e.g.
// home.tsx, the subjects list) can render just the right-hand stat/avatar cluster — the empty
// `<View/>` left in the back button's place still gets `justifyContent: 'space-between'` to push
// that cluster to the right exactly as if a real back button were there.
//
// Figma's back-button label ("SUBJECT") is set via CSS caps in a decorative font — Fredoka,
// the app's display font (see ../theme/fonts.ts), now that it's loaded app-wide.
// `textTransform: 'uppercase'` still does the case conversion so callers can keep passing
// natural-case labels (e.g. "Home", subjectName) unchanged.
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import { useSelector } from 'react-redux';
import { ChevronLeft, Gem, Nut } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { Avatar } from './Avatar';
import { ProfileSwitcherModal } from './ProfileSwitcherModal';
import type { RootState } from '../store/store';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';
import PeanutIcon from '../../assets/icons/peanut.svg';
import XPIcon from '../../assets/icons/xp.svg';

interface MenubarProps {
  label?: string;
  onBackPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Fixed placeholders — see module comment above.
const PEANUTS_PLACEHOLDER = '2.4k';
const XP_PLACEHOLDER = '82.04k';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function Menubar({ label, onBackPress, style }: MenubarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {onBackPress ? (
        <Pressable onPress={onBackPress} style={styles.backButton} hitSlop={8}>
          <ChevronLeft size={24} color={colors.text.secondary} />
          <Text style={styles.backText} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      ) : (
        <View />
      )}

      <View style={styles.rightContent}>
        <View style={styles.statChip}>
          <PeanutIcon />
          <Text style={styles.statText}>{PEANUTS_PLACEHOLDER}</Text>
        </View>
        <View style={styles.statChip}>
          <XPIcon />
          <Text style={styles.statText}>{XP_PLACEHOLDER}</Text>
        </View>
        {activeProfile ? (
          <Pressable onPress={() => setSwitcherOpen(true)} hitSlop={8}>
            <Avatar
              displayName={activeProfile.displayName}
              ageGroup={activeProfile.ageGroup}
              avatarUrl={activeProfile.avatarUrl}
              size={36}
            />
          </Pressable>
        ) : null}
      </View>

      <ProfileSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface.border,
      paddingBottom: spacing.sm,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 2,
    },
    backText: {
      fontFamily: fonts.display.bold,
      fontSize: typography.body,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    rightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      borderRadius: radii.full,
    },
    statText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: fonts.display.medium,
    },
  });
}
