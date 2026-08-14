// Dispatches to one of the shared interaction patterns based on question.type. dnd_single,
// mcq_audio, dnd_build, and dnd_count are now implemented; dnd_select/dnd_sort/dnd_sequence/
// dnd_match/dnd_fill still fall through to the placeholder below — no seeded content exists
// for any of those 5 yet (see docs/technical/mobile-architecture.md), so building renderers
// for them now would be speculative.
//
// Forwards its ref/onReadyChange straight through to whichever single pattern is actually
// rendered — QuizSessionScreen's global Submit button (see questionPatternTypes.ts) talks to
// that pattern through this pass-through rather than QuestionRenderer owning any submit state
// itself.
import { forwardRef } from 'react';
import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@my-backpack/shared';
import type { AgeGroup, IQuestion, IQuestionHelpers } from '@my-backpack/shared';
import { McqPattern } from './patterns/McqPattern';
import { TrueFalsePattern } from './patterns/TrueFalsePattern';
import { TypedInputPattern } from './patterns/TypedInputPattern';
import { DndSinglePattern } from './patterns/DndSinglePattern';
import { DndBuildPattern } from './patterns/DndBuildPattern';
import { DndCountPattern } from './patterns/DndCountPattern';
import { useTheme } from '../../theme/ThemeContext';
import type { QuestionPatternHandle } from './patterns/questionPatternTypes';

const MCQ_TYPES = new Set<IQuestion['type']>([
  'mcq_term_to_def',
  'mcq_def_to_term',
  'mcq_correct_usage',
  'mcq_incorrect_usage',
  'mcq_fill_blank',
  'mcq_audio',
]);

const TRUE_FALSE_TYPES = new Set<IQuestion['type']>([
  'true_false_term_def',
  'true_false_def_term',
  'true_false_usage',
]);

const TYPED_INPUT_TYPES = new Set<IQuestion['type']>([
  'fill_blank_typed',
  'text_input_def',
  'text_input_audio',
  'text_input_example',
]);

export interface QuestionRendererProps {
  question: IQuestion;
  helpers: IQuestionHelpers;
  ageGroup?: AgeGroup;
  lang: string;
  disabled?: boolean;
  onAnswer: (rawResponse: string, selectedOptionIndex?: number) => void;
  onReadyChange?: (ready: boolean) => void;
}

export const QuestionRenderer = forwardRef(function QuestionRenderer(
  { question, helpers, ageGroup, lang, disabled, onAnswer, onReadyChange }: QuestionRendererProps,
  ref: Ref<QuestionPatternHandle>
) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const content = question.content;

  if (MCQ_TYPES.has(question.type)) {
    return (
      <McqPattern
        ref={ref}
        content={content}
        helpers={helpers}
        lang={lang}
        disabled={disabled}
        onAnswer={onAnswer}
        onReadyChange={onReadyChange}
      />
    );
  }

  if (TRUE_FALSE_TYPES.has(question.type)) {
    return (
      <TrueFalsePattern
        ref={ref}
        content={content}
        helpers={helpers}
        lang={lang}
        disabled={disabled}
        onAnswer={onAnswer}
        onReadyChange={onReadyChange}
      />
    );
  }

  if (TYPED_INPUT_TYPES.has(question.type)) {
    return (
      <TypedInputPattern
        ref={ref}
        type={question.type}
        termId={question.termId}
        content={content}
        helpers={helpers}
        lang={lang}
        disabled={disabled}
        onAnswer={onAnswer}
        onReadyChange={onReadyChange}
      />
    );
  }

  if (question.type === 'dnd_single') {
    return (
      <DndSinglePattern
        ref={ref}
        content={content}
        helpers={helpers}
        ageGroup={ageGroup}
        lang={lang}
        disabled={disabled}
        onAnswer={onAnswer}
        onReadyChange={onReadyChange}
      />
    );
  }

  if (question.type === 'dnd_build') {
    return (
      <DndBuildPattern
        ref={ref}
        content={content}
        helpers={helpers}
        ageGroup={ageGroup}
        lang={lang}
        disabled={disabled}
        onAnswer={onAnswer}
        onReadyChange={onReadyChange}
      />
    );
  }

  if (question.type === 'dnd_count') {
    return (
      <DndCountPattern
        ref={ref}
        content={content}
        helpers={helpers}
        ageGroup={ageGroup}
        lang={lang}
        disabled={disabled}
        onAnswer={onAnswer}
        onReadyChange={onReadyChange}
      />
    );
  }

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderEmoji}>🚧</Text>
      <Text style={styles.placeholderTitle}>Question type not yet supported</Text>
      <Text style={styles.placeholderBody}>“{question.type}” questions will be playable in a future update.</Text>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    placeholder: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    placeholderEmoji: {
      fontSize: 32,
    },
    placeholderTitle: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.secondary,
    },
    placeholderBody: {
      fontSize: typography.small,
      color: colors.text.muted,
      textAlign: 'center',
    },
  });
}
