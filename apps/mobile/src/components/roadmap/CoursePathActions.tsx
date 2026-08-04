// Three floating action buttons pinned to the bottom of the Course path — Course & Topic
// redesign, Phase C. Ports Figma's "Course Button" component (file OaE5PxSOT5p8Fby7SUpoP7,
// node 22:27039): two stacked bottom-left (Resources, Quizzes), one bottom-right (Mini-apps).
// Colours/icons pulled directly from the component's three `type` variants — note the variant
// literally named "Lesson" (the component's default) is the Resources button, not a lesson
// shortcut; confirmed by its position/icon (a monitor/video-content glyph) alongside "Quiz" and
// "MiniApp", the two unambiguous variants. Quizzes and Mini-apps have no real destination yet
// (a separate quiz-modes screen isn't built) — both open a placeholder, matching the existing
// Dictionary mini-app "Coming soon." pattern (app/(app)/miniapp/[miniAppId]/index.tsx).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ClipboardCheck, Gamepad2, MonitorPlay } from 'lucide-react-native';
import { radii, spacing } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

interface CoursePathActionsProps {
  onResourcesPress: () => void;
  onQuizzesPress: () => void;
  onMiniAppsPress: () => void;
}

const MINI_APP_DARK = '#1f2937';
const MINI_APP_CREAM = '#fcfded';

export default function CoursePathActions({ onResourcesPress, onQuizzesPress, onMiniAppsPress }: CoursePathActionsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row} pointerEvents="box-none">
      <View style={styles.column}>
        <ActionButton outer={colors.error.dark} inner={colors.error.DEFAULT} onPress={onResourcesPress}>
          <MonitorPlay size={26} color="#fff" />
        </ActionButton>
        <ActionButton outer={colors.primary.dark} inner={colors.primary.DEFAULT} onPress={onQuizzesPress}>
          <ClipboardCheck size={26} color="#fff" />
        </ActionButton>
      </View>
      <ActionButton outer={MINI_APP_DARK} inner={MINI_APP_CREAM} onPress={onMiniAppsPress}>
        <Gamepad2 size={26} color={MINI_APP_DARK} />
      </ActionButton>
    </View>
  );
}

interface ActionButtonProps {
  outer: string;
  inner: string;
  onPress: () => void;
  children: ReactNode;
}

function ActionButton({ outer, inner, onPress, children }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.buttonOuter, { backgroundColor: outer }, pressed && styles.pressed]}>
      <View style={[styles.buttonInner, { backgroundColor: inner }]}>{children}</View>
    </Pressable>
  );
}

const BUTTON_SIZE = 55;

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  column: {
    gap: spacing.sm,
  },
  buttonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    position: 'absolute',
    left: 1,
    top: 2,
    right: 1,
    bottom: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
