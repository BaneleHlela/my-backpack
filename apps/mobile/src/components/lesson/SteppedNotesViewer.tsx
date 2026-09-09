// Renders a Lesson 'steps' resource — a read-only paginated card viewer (not a quiz).
// Ports apps/web's SteppedNotesViewer.tsx onto plain useState + Prev/Next controls.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { BlurView } from 'expo-blur';
import Markdown from 'react-native-markdown-display';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { IResourceStep } from '@my-backpack/shared';
import { createMarkdownStyles } from './markdownStyles';
import { useTheme } from '../../theme/ThemeContext';

interface SteppedNotesViewerProps {
  steps: IResourceStep[];
}

export function SteppedNotesViewer({ steps }: SteppedNotesViewerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const markdownStyles = createMarkdownStyles(colors);
  const [index, setIndex] = useState(0);

  if (steps.length === 0) return null;
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
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

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface.glassSoft,
      // BlurView + overflow:hidden, matching GlassCard.tsx's own recipe exactly — without it
      // this translucent white fill (surface.glass* is unchanged between themes) composites
      // against whatever's actually behind this component (often a flat solid colors.background
      // sheet, e.g. LessonModal.tsx) into a dark, muddy fill in dark mode, making glassText.primary
      // illegible on top of it. See markdownStyles.ts's comment on why glassText is used here.
      overflow: 'hidden',
    },
    stepTitle: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.glassText.primary,
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
      color: colors.glassText.faint,
    },
    stepCount: {
      fontSize: typography.small,
      color: colors.glassText.muted,
    },
  });
}
