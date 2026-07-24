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
import { Image, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radii, typography } from '@my-backpack/shared';
import type { IDraggable } from '@my-backpack/shared';
import { playAudioUrl } from '../../../lib/audio';
import { resolveAssetUrl } from '../../../lib/assetUrl';

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
  { item, size, showLabel, highlight, disabled, isChild, draggable, onTap, onDragStart, onDropAttempt }: DndTileProps,
  ref: Ref<DndTileHandle>
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

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
    .maxDistance(8)
    .onEnd((_e, success) => {
      if (success) runOnJS(onTap)(item);
    });

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .enabled(draggable && !disabled)
    .onStart(() => {
      if (onDragStart) runOnJS(onDragStart)(item);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (onDropAttempt) runOnJS(onDropAttempt)(item, e.absoluteX, e.absoluteY);
    });

  const composedGesture = draggable ? Gesture.Race(tapGesture, panGesture) : tapGesture;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const imageUrl = resolveAssetUrl(item.imageUrl);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.tile,
          isChild && styles.tileChild,
          size ? { width: size, height: size } : null,
          highlight && styles.tileHighlight,
          animatedStyle,
        ]}
      >
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.tileImage} resizeMode="contain" /> : null}
        {showLabel ? <Text style={styles.tileLabel}>{item.label}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  tile: {
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
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
