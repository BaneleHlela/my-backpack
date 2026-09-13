import type { IQuestionContent } from '@my-backpack/shared';
import type { PlaybackSource } from './audio';
import { resolveAssetUrl } from './assetUrl';

export function listeningAudioSource(content: IQuestionContent, language: string, isWordQuestion: boolean): PlaybackSource {
  const encodedUrl = content.prompt?.startsWith('audio:') ? content.prompt.slice(6) : undefined;
  return {
    url: resolveAssetUrl(encodedUrl) ?? resolveAssetUrl(content.promptAudioUrl),
    text: isWordQuestion ? content.correctAnswer : undefined,
    language,
    fallbackToSpeech: isWordQuestion,
  };
}

export function replayAudioSource(content: IQuestionContent, language: string): PlaybackSource {
  const encodedUrl = content.prompt?.startsWith('audio:') ? content.prompt.slice(6) : undefined;
  return {
    url: resolveAssetUrl(content.avatar?.dialogueAudioUrl)
      ?? resolveAssetUrl(content.promptAudioUrl) ?? resolveAssetUrl(encodedUrl),
    text: content.avatar?.dialogue || (encodedUrl ? undefined : content.prompt),
    language,
  };
}
