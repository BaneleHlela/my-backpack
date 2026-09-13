import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  audioSourceKey, getPlaybackState, playAudio, prepareAudio, stopAudio, subscribePlayback,
  type PlaybackSource,
} from './audio';

export function usePlayback() {
  const owner = useRef(Symbol('audio-control')).current;
  const snapshot = useSyncExternalStore(subscribePlayback, getPlaybackState, getPlaybackState);
  const mine = snapshot.owner === owner;
  const stop = useCallback(() => stopAudio(owner), [owner]);
  useEffect(() => stop, [stop]);
  const play = useCallback((source: PlaybackSource) => playAudio(source, owner), [owner]);
  const toggle = useCallback((source: PlaybackSource) => {
    const current = getPlaybackState();
    if (current.owner === owner && current.sourceKey === audioSourceKey(source)
      && (current.status === 'loading' || current.status === 'playing')) stopAudio(owner);
    else playAudio(source, owner);
  }, [owner]);
  return {
    play, stop, toggle,
    status: mine ? snapshot.status : 'idle' as const,
    error: mine ? snapshot.error : null,
    sourceKey: mine ? snapshot.sourceKey : '',
  };
}

export function useAudioPlayback(source: PlaybackSource, preload = true) {
  const playback = usePlayback();
  const key = audioSourceKey(source);
  useEffect(() => {
    if (preload) prepareAudio(source);
    return playback.stop;
    // A semantic source change releases the previous request, even on recycled rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, preload, playback.stop]);
  const toggle = () => playback.toggle(source);
  return { ...playback, toggle, available: Boolean(key) };
}
