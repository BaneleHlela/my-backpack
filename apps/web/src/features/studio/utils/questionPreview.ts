import type { IQuestion } from '@my-backpack/shared';
import { isDndType } from '../questionArchetypes';

export function formatQuestionPreview(question: IQuestion): string {
  if (question.content.prompt) return question.content.prompt;
  if (isDndType(question.type)) {
    const count = question.content.draggables?.length ?? 0;
    return `Drag-and-drop — ${count} item${count === 1 ? '' : 's'}`;
  }
  return question.content.correctAnswer ?? '(no prompt)';
}
