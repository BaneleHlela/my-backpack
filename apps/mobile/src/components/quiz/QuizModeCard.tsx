import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight, Settings2 } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { Text } from '../AppText';
import { getAccent } from '../../theme/accentPalette';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { QuizCardBackground } from './QuizCardBackground';
import {
  formatModeSettingPill,
  QUIZ_PLAY_MODE_ICONS,
  type QuizPlayModeDef,
  type QuizPlayModeId,
  type QuizPlayModeSettings,
} from './quizPlayModes';

interface QuizModeCardProps {
  mode: QuizPlayModeDef;
  settings: QuizPlayModeSettings;
  settingsAdjustable: boolean;
  onPress: () => void;
  onSettingsPress: () => void;
}

// Stable per mode, even when the catalog is reordered or a picker shows only a subset.
// Indices refer to the same palette used by the subject, course and mini-app cards.
const MODE_ACCENTS: Record<QuizPlayModeId, number> = {
  classic: 0,
  hearts: 1,
  time_run: 4,
  streak: 2,
  perfect: 5,
  endless: 3,
  survival: 4,
  mastery: 0,
};

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function QuizModeCard({ mode, settings, settingsAdjustable, onPress, onSettingsPress }: QuizModeCardProps) {
  const { colors, theme } = useTheme();
  const styles = createStyles(colors);
  const accent = getAccent(colors, MODE_ACCENTS[mode.id]);
  const Icon = QUIZ_PLAY_MODE_ICONS[mode.id];
  const showAdjustablePill = settingsAdjustable && mode.settingKey !== 'none';
  const settingLabel = mode.settingKey === 'none' ? 'No settings' : formatModeSettingPill(mode, settings);

  return (
    <View style={styles.card}>
      <QuizCardBackground accentColor={accent.DEFAULT} Icon={Icon} />

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${mode.label}. ${mode.blurb} ${settingLabel}.`}
        accessibilityHint="Starts a quiz with these settings."
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Icon size={25} color={theme === 'dark' ? colors.text.primary : accent.dark} strokeWidth={1.8} />
          </View>
          <View style={styles.startBadge}>
            <ArrowUpRight size={18} color={colors.text.primary} strokeWidth={1.8} />
          </View>
        </View>
        <Text style={styles.title}>{mode.label}</Text>
        <Text style={styles.blurb}>{mode.blurb}</Text>
      </Pressable>

      {/* Sibling controls keep a settings tap from starting the quiz and let assistive
          technology focus each action independently. Fixed settings remain plain text. */}
      {showAdjustablePill ? (
        <Pressable
          onPress={onSettingsPress}
          accessibilityRole="button"
          accessibilityLabel={`${mode.label} settings: ${settingLabel}`}
          accessibilityHint="Opens quiz settings."
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <Settings2 size={16} color={colors.text.primary} />
          <Text style={styles.pillText}>{settingLabel}</Text>
        </Pressable>
      ) : (
        <View style={[styles.pill, styles.pillStatic]}>
          <Text style={styles.pillText}>{settingLabel}</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    body: {
      flex: 1,
      minHeight: 196,
      padding: spacing.md,
      gap: spacing.sm,
    },
    pressed: {
      opacity: 0.72,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    startBadge: {
      width: 30,
      height: 30,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    title: {
      fontFamily: fonts.display.semibold,
      fontSize: 22,
      color: colors.text.primary,
    },
    blurb: {
      fontSize: typography.small,
      lineHeight: 20,
      color: colors.text.secondary,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      gap: spacing.xs,
      minHeight: 44,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      backgroundColor: colors.background,
    },
    pillStatic: {
      backgroundColor: 'transparent',
    },
    pillText: {
      flexShrink: 1,
      fontFamily: fonts.display.medium,
      fontSize: typography.small,
      color: colors.text.primary,
      textAlign: 'center',
    },
  });
}
