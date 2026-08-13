// One card in the Quiz Mode Select grid (QuizModeSelectScreen). Built on GlassCard per this
// app's established convention — no ad hoc card styling. The settings pill only becomes an
// interactive control when `settingsAdjustable` is true (mirrors Quiz.isUserAdjustable — see
// quizPlayModes.ts's module comment for why that flag is derived from session source rather
// than fetched); otherwise it renders as a static, non-pressable label so a fixed roadmap/course
// quiz still communicates its (non-editable) mode-specific value without inviting a tap that
// would do nothing.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Settings2 } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import { formatModeSettingPill, type QuizPlayModeDef, type QuizPlayModeSettings } from './quizPlayModes';

interface QuizModeCardProps {
  mode: QuizPlayModeDef;
  settings: QuizPlayModeSettings;
  settingsAdjustable: boolean;
  onPress: () => void;
  onSettingsPress: () => void;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function QuizModeCard({ mode, settings, settingsAdjustable, onPress, onSettingsPress }: QuizModeCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const Icon = mode.icon;
  const showAdjustablePill = settingsAdjustable && mode.settingKey !== 'none';

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <GlassCard intensity="default" style={styles.card}>
        <View style={styles.iconBadge}>
          <Icon size={26} color={colors.primary.DEFAULT} strokeWidth={2} />
        </View>
        <Text style={styles.title}>{mode.label}</Text>
        <Text style={styles.blurb} numberOfLines={3}>
          {mode.blurb}
        </Text>
        {showAdjustablePill ? (
          <Pressable onPress={onSettingsPress} style={styles.pill} hitSlop={6}>
            <Settings2 size={12} color={colors.primary.dark} />
            <Text style={styles.pillText}>{formatModeSettingPill(mode, settings)}</Text>
          </Pressable>
        ) : (
          <View style={[styles.pill, styles.pillStatic]}>
            <Text style={[styles.pillText, styles.pillStaticText]}>
              {mode.settingKey === 'none' ? 'No settings' : formatModeSettingPill(mode, settings)}
            </Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pressable: {
      flex: 1,
    },
    card: {
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 190,
    },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.glassSoft,
    },
    title: {
      fontFamily: 'Fredoka_600SemiBold',
      fontSize: typography.body,
      color: colors.text.primary,
      textAlign: 'center',
    },
    blurb: {
      fontFamily: 'Fredoka_400Regular',
      fontSize: typography.small,
      color: colors.text.secondary,
      textAlign: 'center',
      flex: 1,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassStrong,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    pillStatic: {
      backgroundColor: colors.surface.glassSoft,
    },
    pillText: {
      fontFamily: 'Fredoka_500Medium',
      fontSize: typography.small,
      color: colors.primary.dark,
    },
    pillStaticText: {
      color: colors.text.muted,
    },
  });
}
