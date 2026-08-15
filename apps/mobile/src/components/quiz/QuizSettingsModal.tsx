// Centered settings modal opened from a QuizModeCard's settings pill. Adapts the
// Modal + backdrop-Pressable + no-op inner-Pressable interaction pattern established by
// src/components/course/LessonModal.tsx / ResourcesModal.tsx (bottom-sheet, animationType
// "slide") to a centered dialog instead (animationType "fade") — there's no Figma frame for
// this modal specifically (only the mode-select grid has one), so it's styled to match those
// two components' GlassCard/theme-token usage rather than pulled from a design file. See
// docs/technical/mobile-architecture.md's "Quiz Modes" section.
//
// Local component state only — nothing here persists or calls the API (see CLAUDE.md's "Quiz
// Modes" entry). "Start Quiz" both saves the draft settings back to the caller (so the pill
// reflects the new value) and starts the session in one action, matching how the brief scoped
// Phase 5: starting from the modal's confirm action is equivalent to starting from the card body.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../AppText';
import { X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { PrimaryButton } from '../PrimaryButton';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { QUIZ_PLAY_MODE_ICONS, type QuizPlayModeDef, type QuizPlayModeSettings } from './quizPlayModes';

interface QuizSettingsModalProps {
  mode: QuizPlayModeDef;
  settings: QuizPlayModeSettings;
  onClose: () => void;
  onConfirm: (settings: QuizPlayModeSettings) => void;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function QuizSettingsModal({ mode, settings, onClose, onConfirm }: QuizSettingsModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const Icon = QUIZ_PLAY_MODE_ICONS[mode.id];
  const [draft, setDraft] = useState<QuizPlayModeSettings>(settings);

  const currentValue =
    mode.settingKey === 'questionCount'
      ? draft.questionCount
      : mode.settingKey === 'duration'
        ? draft.duration
        : mode.settingKey === 'hearts'
          ? draft.hearts
          : mode.settingKey === 'mistakeLimit'
            ? draft.mistakeLimit
            : mode.settingKey === 'streakTarget'
              ? draft.streakTarget
              : undefined;

  const setModeValue = (value: number) => {
    setDraft((prev) => ({
      ...prev,
      ...(mode.settingKey === 'questionCount' && { questionCount: value }),
      ...(mode.settingKey === 'duration' && { duration: value }),
      ...(mode.settingKey === 'hearts' && { hearts: value }),
      ...(mode.settingKey === 'mistakeLimit' && { mistakeLimit: value }),
      ...(mode.settingKey === 'streakTarget' && { streakTarget: value }),
    }));
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <GlassCard intensity="strong" style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconBadge}>
                  <Icon size={20} color={colors.primary.DEFAULT} />
                </View>
                <Text style={styles.headerTitle}>{mode.label}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.text.muted} />
              </Pressable>
            </View>

            {mode.settingKey !== 'none' && mode.settingOptions ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{mode.settingLabel}</Text>
                <View style={styles.optionsRow}>
                  {mode.settingOptions.map((opt) => {
                    const selected = currentValue === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setModeValue(opt.value)}
                        style={[styles.optionChip, selected && styles.optionChipSelected]}
                      >
                        <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={styles.noSettingsText}>{mode.blurb}</Text>
            )}

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>General</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Show answers at the end</Text>
                <Switch
                  value={draft.feedbackMode === 'end'}
                  onValueChange={(v) => setDraft((prev) => ({ ...prev, feedbackMode: v ? 'end' : 'immediate' }))}
                  trackColor={{ false: colors.surface.glassSoft, true: colors.primary.DEFAULT }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Shuffle questions</Text>
                <Switch
                  value={!!draft.shuffleQuestions}
                  onValueChange={(v) => setDraft((prev) => ({ ...prev, shuffleQuestions: v }))}
                  trackColor={{ false: colors.surface.glassSoft, true: colors.primary.DEFAULT }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <PrimaryButton title="Start Quiz" onPress={() => onConfirm(draft)} />
          </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: spacing.lg,
    },
    card: {
      width: 340,
      maxWidth: '100%',
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.glassSoft,
    },
    headerTitle: {
      fontFamily: fonts.display.semibold,
      fontSize: typography.heading,
      color: colors.text.primary,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      fontFamily: fonts.display.medium,
      fontSize: typography.small,
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    optionChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassSoft,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    optionChipSelected: {
      backgroundColor: colors.primary.DEFAULT,
      borderColor: colors.primary.DEFAULT,
    },
    optionChipText: {
      fontFamily: fonts.display.medium,
      fontSize: typography.small,
      color: colors.text.secondary,
    },
    optionChipTextSelected: {
      color: '#fff',
    },
    noSettingsText: {
      fontFamily: fonts.display.regular,
      fontSize: typography.small,
      color: colors.text.secondary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.surface.border,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleLabel: {
      fontFamily: fonts.display.regular,
      fontSize: typography.body,
      color: colors.text.primary,
      flex: 1,
      marginRight: spacing.sm,
    },
  });
}
