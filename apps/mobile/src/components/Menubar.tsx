// Shared top bar for every screen that previously rolled its own back-button row. Ports Figma's
// "Menubar" component (file OaE5PxSOT5p8Fby7SUpoP7, node 22:27039's Stack > Menubar — pulled
// during the Course & Topic redesign research): a back chevron + caps label on the left, and a
// Peanuts / XP / profile-avatar cluster on the right.
//
// Peanuts and XP are shown as fixed placeholders (not wired to real data) — the reward system
// exists in the data model but the service layer isn't built yet (see root CLAUDE.md's "XP and
// peanuts reward system" note), so there is nothing real to display yet. The profile avatar is
// NOT a placeholder — `state.auth.activeProfile` already holds the real signed-in profile, so
// its initials are shown directly, the same way select-profile.tsx's ProfileTile does it.
//
// Figma's back-button label ("SUBJECT") is set via CSS caps in a decorative font (Chewy) this
// app doesn't load — `textTransform: 'uppercase'` on the existing system-font style gets the
// same visual effect without pulling in a new font asset, so callers can keep passing natural-
// case labels (e.g. "Home", subjectName) unchanged.
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { ChevronLeft, Gem, Nut } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { RootState } from '../store/store';
import { useTheme } from '../theme/ThemeContext';

interface MenubarProps {
  label: string;
  onBackPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// Fixed placeholders — see module comment above.
const PEANUTS_PLACEHOLDER = '0';
const XP_PLACEHOLDER = '0';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Menubar({ label, onBackPress, style }: MenubarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={onBackPress} style={styles.backButton} hitSlop={8}>
        <ChevronLeft size={18} color={colors.text.secondary} />
        <Text style={styles.backText} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>

      <View style={styles.rightContent}>
        <View style={styles.statChip}>
          <Nut size={16} color={colors.warning.DEFAULT} />
          <Text style={styles.statText}>{PEANUTS_PLACEHOLDER}</Text>
        </View>
        <View style={styles.statChip}>
          <Gem size={16} color={colors.primary.DEFAULT} />
          <Text style={styles.statText}>{XP_PLACEHOLDER}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{activeProfile ? initials(activeProfile.displayName) : ''}</Text>
        </View>
      </View>
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
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 2,
    },
    backText: {
      fontSize: typography.small,
      fontWeight: '700',
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
      backgroundColor: colors.surface.glassSoft,
    },
    statText: {
      fontSize: typography.small,
      fontWeight: '700',
      color: colors.text.primary,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderWidth: 1,
      borderColor: colors.text.primary,
    },
    avatarText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
