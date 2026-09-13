// Shared draggable-tile primitive + small utilities for the DnD patterns beyond dnd_single —
// dnd_build (multi-blank) and dnd_count (multi-item-per-zone) both need a tile that can be
// dragged out of a pool and, once placed, TAPPED TO REMOVE itself back to the pool — the
// behavioral difference from DndSinglePattern's single always-one-slot zone, where a placed
// tile just becomes a static (non-draggable, tap-for-audio) display, never removable, because
// autoSubmit fires the instant that one slot fills. dnd_build/dnd_count both need to let a
// learner correct a wrong letter or a miscounted item without restarting the whole question,
// so their placed tiles stay tappable — just for removal instead of audio. DndSinglePattern's
// own tile stays local to that file (nothing here changes its behavior); this is the same
// gesture recipe extracted for reuse by the two new patterns, not a replacement.
import { forwardRef, useImperativeHandle } from 'react';
import type { Ref } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Text } from '../../AppText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radii } from '@my-backpack/shared';
import type { IDraggable } from '@my-backpack/shared';
import { playAudioUrl } from '../../../lib/audio';
import { resolveAssetUrl } from '../../../lib/assetUrl';
import { useTheme } from '../../../theme/ThemeContext';
import { useQuestionScrollRef } from '../QuestionScrollArea';

export function playAsset(path?: string): void {
  const url = resolveAssetUrl(path);
  if (url) playAudioUrl(url);
}

// Fisher-Yates — unbiased in-place shuffle, returns a new array. Mirrors DndSinglePattern's.
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Tiles shrink to fit a small phone width instead of overflowing as draggable count escalates
// — same fixed clamp(56px, 18vw, 76px) DndSinglePattern uses (escalation comes from flex-wrap
// laying more same-sized tiles across more rows, not from shrinking further per item).
export function clampTileSize(windowWidth: number): number {
  return Math.min(76, Math.max(56, windowWidth * 0.18));
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pointInRect(x: number, y: number, rect: Rect | null | undefined): boolean {
  return rect != null && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export interface DndTileHandle {
  snapBack: () => void;
}

export interface DndTileProps {
  item: IDraggable;
  size?: number;
  showLabel: boolean;
  highlight?: boolean;
  disabled?: boolean;
  isChild?: boolean;
  draggable: boolean; // false for a tile already placed in a zone — tap-only (see onTap)
  onTap: (item: IDraggable) => void; // pool tile: play audio. Placed tile: remove from zone.
  onDragStart?: (item: IDraggable) => void;
  onDropAttempt?: (item: IDraggable, absoluteX: number, absoluteY: number) => void;
}

export const DndTile = forwardRef(function DndTile(
  {
    item,
    size,
    showLabel,
    highlight,
    disabled,
    isChild,
    draggable,
    onTap,
    onDragStart,
    onDropAttempt,
  }: DndTileProps,
  ref: Ref<DndTileHandle>
) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const active = useSharedValue(false);
  const scrollRef = useQuestionScrollRef();

  useImperativeHandle(ref, () => ({
    snapBack: () => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  }));

  // onStart/onUpdate/onEnd run as worklets on the UI thread — every call into plain JS (state
  // setters, audio playback) must cross back via runOnJS, or it throws at runtime despite
  // compiling and bundling fine (only surfaces once the gesture actually fires — see
  // DndSinglePattern.tsx / docs/technical/mobile-architecture.md for where this was first found).
  const tapGesture = Gesture.Tap()
    .onBegin(() => { active.value = true; })
    .onFinalize(() => { active.value = false; })
    .maxDistance(8)
    .onEnd((_e, success) => {
      if (success) runOnJS(onTap)(item);
    });

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .enabled(draggable && !disabled)
    .onStart(() => {
      active.value = true;
      if (onDragStart) runOnJS(onDragStart)(item);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (onDropAttempt) runOnJS(onDropAttempt)(item, e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      active.value = false;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  if (scrollRef) panGesture.blocksExternalGesture(scrollRef);

  const composedGesture = draggable ? Gesture.Race(tapGesture, panGesture) : tapGesture;

  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: active.value ? 20 : 0,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: active.value ? 1.08 : 1 }],
  }));

  const imageUrl = item.label?.trim() ? undefined : resolveAssetUrl(item.imageUrl);
  const palette = ['#7959CF', '#30834C', '#B76A12', '#356CB5'];
  const tileColor = palette[Array.from(item.label || item.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) % palette.length];

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.tile,
          isChild && styles.tileChild,
          { backgroundColor: tileColor, borderColor: tileColor },
          size ? { width: size, height: size } : null,
          highlight && styles.tileHighlight,
          animatedStyle,
        ]}
      >
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.tileImage} resizeMode="contain" /> : null}
        {(showLabel || !imageUrl) && item.label ? <Text adjustsFontSizeToFit numberOfLines={2} style={styles.tileLabel}>{item.label}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    tile: {
      borderBottomWidth: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 0,
      width: 64,
      height: 64,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.glassStrong,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    tileChild: {
      borderRadius: radii.lg,
      borderWidth: 3,
      borderColor: colors.primary.light,
      backgroundColor: '#fff',
    },
    tileHighlight: {
      borderColor: colors.warning.DEFAULT,
      borderWidth: 3,
    },
    tileImage: {
      width: '70%',
      height: '70%',
    },
    tileLabel: {
      paddingHorizontal: 6,
      textAlign: 'center',
      fontSize: 32,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
