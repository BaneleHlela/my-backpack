// The 7-card mode grid + its settings modal wiring, extracted out of QuizModeSelectScreen so
// the same grid/behavior can be embedded elsewhere (QuizPickerModal's "Game Quizzes" tab) without
// duplicating the FlatList/settings-state logic. Plain flexWrap layout, not FlatList — this can
// be embedded inside another component's ScrollView (QuizPickerModal), and nesting a
// VirtualizedList inside a ScrollView of the same orientation is an RN anti-pattern; 7 items is
// small enough that virtualization buys nothing here anyway.
//
// UI/local-state only — see quizPlayModes.ts's module comment. `onStart` is called either from a
// card's body tap (mode-specific settings stay at their current default/last-picked value) or
// from QuizSettingsModal's "Start Quiz" (after saving the just-picked settings back here) — the
// caller decides what "start" actually does (navigate to a session route directly, or via the
// full mode-select screen).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@my-backpack/shared';
import { QuizModeCard } from './QuizModeCard';
import { QuizSettingsModal } from './QuizSettingsModal';
import { QUIZ_PLAY_MODES, type QuizPlayModeId, type QuizPlayModeSettings } from './quizPlayModes';

interface QuizModeGridProps {
  settingsAdjustable: boolean;
  onStart: (modeId: QuizPlayModeId, settings: QuizPlayModeSettings) => void;
}

function buildInitialSettings(): Record<QuizPlayModeId, QuizPlayModeSettings> {
  const initial = {} as Record<QuizPlayModeId, QuizPlayModeSettings>;
  for (const mode of QUIZ_PLAY_MODES) {
    initial[mode.id] = { ...mode.defaultSettings, feedbackMode: 'immediate', shuffleQuestions: false };
  }
  return initial;
}

export function QuizModeGrid({ settingsAdjustable, onStart }: QuizModeGridProps) {
  const [settingsByMode, setSettingsByMode] = useState<Record<QuizPlayModeId, QuizPlayModeSettings>>(
    buildInitialSettings
  );
  const [editingModeId, setEditingModeId] = useState<QuizPlayModeId | null>(null);
  const editingMode = editingModeId ? QUIZ_PLAY_MODES.find((m) => m.id === editingModeId) : undefined;

  return (
    <View style={styles.grid}>
      {QUIZ_PLAY_MODES.map((mode) => (
        <View key={mode.id} style={styles.cardWrapper}>
          <QuizModeCard
            mode={mode}
            settings={settingsByMode[mode.id]}
            settingsAdjustable={settingsAdjustable}
            onPress={() => onStart(mode.id, settingsByMode[mode.id])}
            onSettingsPress={() => setEditingModeId(mode.id)}
          />
        </View>
      ))}

      {editingMode && (
        <QuizSettingsModal
          mode={editingMode}
          settings={settingsByMode[editingMode.id]}
          onClose={() => setEditingModeId(null)}
          onConfirm={(next) => {
            setSettingsByMode((prev) => ({ ...prev, [editingMode.id]: next }));
            setEditingModeId(null);
            onStart(editingMode.id, next);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWrapper: {
    width: '47%',
  },
});
