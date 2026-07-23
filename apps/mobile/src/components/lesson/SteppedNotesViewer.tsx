// Renders a Lesson 'steps' resource — a read-only paginated card viewer (not a quiz).
// Ports apps/web's SteppedNotesViewer.tsx onto plain useState + Prev/Next controls.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { IResourceStep } from '@my-backpack/shared';
import { markdownStyles } from './markdownStyles';

interface SteppedNotesViewerProps {
  steps: IResourceStep[];
}

export function SteppedNotesViewer({ steps }: SteppedNotesViewerProps) {
  const [index, setIndex] = useState(0);

  if (steps.length === 0) return null;
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <View style={styles.wrapper}>
      {step.title ? <Text style={styles.stepTitle}>{step.title}</Text> : null}
      <Markdown style={markdownStyles}>{step.content}</Markdown>

      <View style={styles.nav}>
        <Pressable disabled={isFirst} onPress={() => setIndex((i) => i - 1)} hitSlop={8}>
          <Text style={[styles.navText, isFirst && styles.navTextDisabled]}>‹ Prev</Text>
        </Pressable>
        <Text style={styles.stepCount}>
          {index + 1} / {steps.length}
        </Text>
        <Pressable disabled={isLast} onPress={() => setIndex((i) => i + 1)} hitSlop={8}>
          <Text style={[styles.navText, isLast && styles.navTextDisabled]}>Next ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
  },
  stepTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  navText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  navTextDisabled: {
    color: colors.text.faint,
  },
  stepCount: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
});
