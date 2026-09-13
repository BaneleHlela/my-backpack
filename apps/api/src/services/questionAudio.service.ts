import Term from '../models/apps/language/vocabulary/term.model';
import type { IQuestionDocument } from '../models/apps/language/vocabulary/question.model';

// Older generated listening questions only contain instructions + termId. Attach
// their recording to the response so clients do not need a second term-detail request.
// This enriches the response document; it does not save or migrate stored questions.
export async function attachQuestionAudio(question: IQuestionDocument | null): Promise<IQuestionDocument | null> {
  if (!question || question.type !== 'text_input_audio' || !question.termId
    || question.content.promptAudioUrl || question.content.prompt?.startsWith('audio:')) return question;
  // Audio enrichment is optional: a transient lookup failure must not turn an
  // already-recorded quiz answer into a failed submit. Mobile can read the word.
  const term = await Term.findById(question.termId).select('audioUrl').lean().catch(() => null);
  if (term?.audioUrl) question.content = { ...question.content, promptAudioUrl: term.audioUrl };
  return question;
}
