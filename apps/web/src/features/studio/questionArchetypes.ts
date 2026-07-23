// The 21 QuestionType values collapse into 5 form archetypes (see
// docs/content/content-studio-design.md). v1 exposes 16 of them: the 13 with an existing
// frontend quiz renderer (12 text-based types + dnd_single), plus mcq_audio/dnd_build/dnd_count
// (already used in real seed content). The remaining 5 (dnd_select, dnd_sort, dnd_sequence,
// dnd_match, dnd_fill) are a config-table addition later, not built here.
import type { QuestionType } from '@my-backpack/shared';

export type QuestionArchetype = 'mcq' | 'trueFalse' | 'textInput' | 'dndBasic' | 'dndFillBuild';

export interface TypeOption {
  value: QuestionType;
  label: string;
}

export interface ArchetypeConfig {
  id: QuestionArchetype;
  label: string;
  types: TypeOption[];
}

export const ARCHETYPES: ArchetypeConfig[] = [
  {
    id: 'mcq',
    label: 'Multiple choice',
    types: [
      { value: 'mcq_term_to_def', label: 'Show term, pick the definition' },
      { value: 'mcq_def_to_term', label: 'Show definition, pick the term' },
      { value: 'mcq_correct_usage', label: 'Pick the sentence that uses the word correctly' },
      { value: 'mcq_incorrect_usage', label: 'Pick the sentence that uses the word incorrectly' },
      { value: 'mcq_fill_blank', label: 'Sentence with a blank, pick the correct word' },
      { value: 'mcq_audio', label: 'Play audio, pick the correct answer' },
    ],
  },
  {
    id: 'trueFalse',
    label: 'True / False',
    types: [
      { value: 'true_false_term_def', label: 'Is this definition correct for this term?' },
      { value: 'true_false_def_term', label: 'Is this term correct for this definition?' },
      { value: 'true_false_usage', label: 'Is the word used correctly in this sentence?' },
    ],
  },
  {
    id: 'textInput',
    label: 'Text input',
    types: [
      { value: 'fill_blank_typed', label: 'Sentence with a blank, type the exact word' },
      { value: 'text_input_def', label: 'Shown the definition, type the term' },
      { value: 'text_input_audio', label: 'Hear audio, type the term' },
      { value: 'text_input_example', label: 'Example sentence with the word removed, type it' },
    ],
  },
  {
    id: 'dndBasic',
    label: 'Drag & drop',
    types: [
      { value: 'dnd_single', label: 'Drag one item to one zone' },
      { value: 'dnd_count', label: 'Drag a specific quantity of items to a zone' },
    ],
  },
  {
    id: 'dndFillBuild',
    label: 'Drag & drop — build a word/sentence',
    types: [{ value: 'dnd_build', label: 'Drag letters or syllables to build a word' }],
  },
];

const TYPE_TO_ARCHETYPE: Record<QuestionType, QuestionArchetype | undefined> = {} as Record<
  QuestionType,
  QuestionArchetype | undefined
>;
for (const archetype of ARCHETYPES) {
  for (const type of archetype.types) {
    TYPE_TO_ARCHETYPE[type.value] = archetype.id;
  }
}

export function archetypeForType(type: QuestionType): QuestionArchetype {
  return TYPE_TO_ARCHETYPE[type] ?? 'mcq';
}

export function isDndType(type: QuestionType): boolean {
  const archetype = archetypeForType(type);
  return archetype === 'dndBasic' || archetype === 'dndFillBuild';
}

export function isDndFillBuild(type: QuestionType): boolean {
  return archetypeForType(type) === 'dndFillBuild';
}

export const DEFAULT_MAX_POINTS: Record<QuestionType, number> = {
  mcq_term_to_def: 4,
  mcq_def_to_term: 4,
  mcq_correct_usage: 5,
  mcq_incorrect_usage: 7,
  mcq_fill_blank: 4,
  fill_blank_typed: 6,
  true_false_term_def: 2,
  true_false_def_term: 2,
  true_false_usage: 3,
  text_input_def: 5,
  text_input_audio: 5,
  text_input_example: 5,
  mcq_audio: 4,
  dnd_single: 4,
  dnd_select: 4,
  dnd_count: 4,
  dnd_sort: 5,
  dnd_sequence: 5,
  dnd_match: 5,
  dnd_fill: 5,
  dnd_build: 5,
};
