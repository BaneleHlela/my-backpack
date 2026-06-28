// Pure function to merge question default helpers with node-level overrides.
// Frontend calls this at render time to get the final IQuestionHelpers config.
// resolveHelpers(question.content.defaultHelpers, nodeAssignment.helperOverrides) → IQuestionHelpers
import {
  IQuestionHelpers,
  IQuestionContent,
  INodeQuestionAssignment,
  defaultHelpers,
} from '../types/question';

// Suppress unused-import warnings — these are re-exported for convenience.
export type { IQuestionContent, INodeQuestionAssignment };

export function resolveHelpers(
  questionDefaults: Partial<IQuestionHelpers> | undefined,
  nodeOverrides: Partial<IQuestionHelpers> | undefined
): IQuestionHelpers {
  return {
    ...defaultHelpers,
    ...(questionDefaults ?? {}),
    ...(nodeOverrides ?? {}),
  };
}
