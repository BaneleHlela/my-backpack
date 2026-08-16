// Floating action buttons pinned to the bottom-left of the Course path. Originally 4 always-
// visible buttons in two fixed columns (Course & Topic redesign, Phase C); redesigned August
// 2026 into a single toggle button that expands a vertical stack of the same 4 actions,
// animated to read as if they were sitting stacked directly behind the toggle button and flip
// out into view on a ~90° rotation as it opens (Reanimated `rotateX` 90deg->0deg + scale +
// translateY, staggered bottom-to-top on open, reversed top-to-bottom on close so they read as
// folding back behind the toggle) — same props/behavior contract as before
// (onResourcesPress/onQuizzesPress/onMiniAppsPress/onChatPress), so CourseScreen.tsx needed no
// changes, only this file's internals.
//
// Colours/icons per action are unchanged from the original Figma-sourced variants (file
// OaE5PxSOT5p8Fby7SUpoP7, node 22:27039) — Resources uses the component's default "Lesson"
// variant (a monitor/video-content glyph, not a lesson shortcut — see the old module comment
// history), Quizzes/MiniApp are the two unambiguous variants; Chat (added for Course Chat) has
// no Figma source, so it kept its own emerald/success pairing to stay visually distinct.
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ClipboardCheck, Gamepad2, LayoutGrid, MessagesSquare, MonitorPlay, X } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { radii, spacing } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

interface CoursePathActionsProps {
  onResourcesPress: () => void;
  onQuizzesPress: () => void;
  onMiniAppsPress: () => void;
  onChatPress: () => void;
}

const MINI_APP_DARK = '#1f2937';
const MINI_APP_CREAM = '#fcfded';
const BUTTON_SIZE = 55;
const MAIN_BUTTON_SIZE = 60;
const GAP = spacing.sm;
const STAGGER_MS = 60;
const TOTAL_ACTIONS = 4;

export default function CoursePathActions({
  onResourcesPress,
  onQuizzesPress,
  onMiniAppsPress,
  onChatPress,
}: CoursePathActionsProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const actions: { outer: string; inner: string; icon: ReactNode; onPress: () => void }[] = [
    {
      outer: colors.error.dark,
      inner: colors.error.DEFAULT,
      icon: <MonitorPlay size={24} color="#fff" />,
      onPress: onResourcesPress,
    },
    {
      outer: colors.primary.dark,
      inner: colors.primary.DEFAULT,
      icon: <ClipboardCheck size={24} color="#fff" />,
      onPress: onQuizzesPress,
    },
    {
      outer: colors.success.dark,
      inner: colors.success.DEFAULT,
      icon: <MessagesSquare size={24} color="#fff" />,
      onPress: onChatPress,
    },
    {
      outer: MINI_APP_DARK,
      inner: MINI_APP_CREAM,
      icon: <Gamepad2 size={24} color={MINI_APP_DARK} />,
      onPress: onMiniAppsPress,
    },
  ];

  const handleActionPress = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {actions.map((action, index) => (
        <ExpandingActionButton
          key={index}
          index={index}
          open={open}
          outer={action.outer}
          inner={action.inner}
          onPress={() => handleActionPress(action.onPress)}
        >
          {action.icon}
        </ExpandingActionButton>
      ))}

      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.mainButtonOuter,
          { backgroundColor: colors.text.primary },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.mainButtonInner, { backgroundColor: colors.background }]}>
          {open ? <X size={26} color={colors.text.primary} /> : <LayoutGrid size={24} color={colors.text.primary} />}
        </View>
      </Pressable>
    </View>
  );
}

interface ExpandingActionButtonProps {
  index: number;
  open: boolean;
  outer: string;
  inner: string;
  onPress: () => void;
  children: ReactNode;
}

function ExpandingActionButton({ index, open, outer, inner, onPress, children }: ExpandingActionButtonProps) {
  // Negative translateY (upward) resting position for this button's slot in the stack — index 0
  // sits directly above the main button, each subsequent index one BUTTON_SIZE+GAP further up.
  const restingOffset = -(MAIN_BUTTON_SIZE + GAP + index * (BUTTON_SIZE + GAP));
  // Opening staggers bottom-to-top (index 0 first, closest to the main button); closing reverses
  // the order (the top-most button, highest index, retracts first) so it reads as the stack
  // folding back behind the main button the same way it unfolded.
  const openDelay = index * STAGGER_MS;
  const closeDelay = (TOTAL_ACTIONS - 1 - index) * STAGGER_MS;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      progress.value = withDelay(openDelay, withSpring(1, { damping: 14, stiffness: 180 }));
    } else {
      progress.value = withDelay(closeDelay, withTiming(0, { duration: 160 }));
    }
  }, [open, openDelay, closeDelay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: progress.value * restingOffset },
      { scale: 0.3 + progress.value * 0.7 },
      { perspective: 600 },
      { rotateX: `${(1 - progress.value) * 90}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.actionWrapper, animatedStyle]} pointerEvents={open ? 'auto' : 'none'}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.buttonOuter, { backgroundColor: outer }, pressed && styles.pressed]}
      >
        <View style={[styles.buttonInner, { backgroundColor: inner }]}>{children}</View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.lg,
    width: MAIN_BUTTON_SIZE,
    alignItems: 'center',
  },
  // Explicit left/width (rather than relying on the parent's alignItems) so each stacked
  // button's horizontal centering under the main button doesn't depend on Yoga's default
  // static-position behavior for an absolutely-positioned child.
  actionWrapper: {
    position: 'absolute',
    left: (MAIN_BUTTON_SIZE - BUTTON_SIZE) / 2,
    bottom: 0,
    width: BUTTON_SIZE,
    alignItems: 'center',
  },
  mainButtonOuter: {
    width: MAIN_BUTTON_SIZE,
    height: MAIN_BUTTON_SIZE,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonInner: {
    position: 'absolute',
    left: 2,
    top: 2,
    right: 2,
    bottom: 2,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
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
