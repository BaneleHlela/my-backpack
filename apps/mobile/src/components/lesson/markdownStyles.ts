// Shared react-native-markdown-display style map for Lesson 'notes' resources and
// SteppedNotesViewer's per-step content — both render short-form markdown (headings, bold,
// bullet points), not full documents.
import { colors, typography } from '@my-backpack/shared';

export const markdownStyles = {
  body: {
    color: colors.text.secondary,
    fontSize: typography.body,
  },
  heading1: {
    color: colors.text.primary,
    fontSize: typography.headingLg,
    fontWeight: '700' as const,
  },
  heading2: {
    color: colors.text.primary,
    fontSize: typography.heading,
    fontWeight: '700' as const,
  },
  strong: {
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  bullet_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
};
