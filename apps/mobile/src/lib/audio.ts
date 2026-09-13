// Short-form audio has one owner. New taps replace old requests, including
// requests still buffering or waiting for the native speech engine to start.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { resolveAssetUrl } from './assetUrl';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';
export interface PlaybackSource {
  url?: string;
  text?: string;
  language?: string;
  // Dictionary pronunciation may fall back to TTS. Phonics recordings must
  // retain their authored sound, so this is opt-in, never a global fallback.
  fallbackToSpeech?: boolean;
}
export interface PlaybackState {
  owner: symbol | null;
  sourceKey: string;
  status: PlaybackStatus;
  error: string | null;
}

export const AUDIO_LOAD_TIMEOUT_MS = 8000;
const MAX_PREPARED_PLAYERS = 6;
const idle: PlaybackState = { owner: null, sourceKey: '', status: 'idle', error: null };
let state = idle;
const listeners = new Set<() => void>();
type PlayerEntry = { player: AudioPlayer; url: string; expiry?: ReturnType<typeof setTimeout> };
type Request = {
  owner: symbol;
  source: PlaybackSource;
  entry?: PlayerEntry;
  subscription?: { remove(): void };
  timer?: ReturnType<typeof setTimeout>;
  speechStarted?: boolean;
  triedSpeech?: boolean;
  playIssued?: boolean;
};
const players = new Map<string, PlayerEntry>();
let active: Request | undefined;
let audioMode: Promise<void> | undefined;
// Native stop is asynchronous. A newer utterance must never race an older stop.
let speechBarrier: Promise<void> = Promise.resolve();
let voicesPromise: Promise<Speech.Voice[]> | undefined;

export function initializeSpeech(): Promise<Speech.Voice[]> {
  if (!voicesPromise) {
    voicesPromise = Speech.getAvailableVoicesAsync().then((voices) => {
      if (!voices.length) voicesPromise = undefined; // Retry after a voice is installed.
      return voices;
    }).catch((error) => { voicesPromise = undefined; throw error; });
  }
  return voicesPromise;
}

export function audioSourceKey(source: PlaybackSource): string {
  const url = resolveAssetUrl(source.url);
  return url ? `url:${url}` : source.text?.trim()
    ? `speech:${source.language ?? ''}:${source.text.trim()}` : '';
}

export const getPlaybackState = () => state;
export function subscribePlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(next: PlaybackState) {
  if (Object.keys(next).every((key) => next[key as keyof PlaybackState] === state[key as keyof PlaybackState])) return;
  state = next;
  listeners.forEach((listener) => listener());
}

function update(request: Request, status: PlaybackStatus, error: string | null = null) {
  if (active !== request) return;
  publish({ owner: request.owner, sourceKey: audioSourceKey(request.source), status, error });
}

export function initializeAudio(): Promise<void> {
  if (!audioMode) {
    audioMode = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    }).catch((error) => { audioMode = undefined; throw error; });
  }
  return audioMode;
}

function discard(entry: PlayerEntry) {
  clearTimeout(entry.expiry);
  if (players.get(entry.url) === entry) players.delete(entry.url);
  try { entry.player.remove(); } catch { /* Already released by the OS. */ }
}

function getPlayer(url: string): PlayerEntry {
  let entry = players.get(url);
  if (entry?.player.currentStatus.error) { discard(entry); entry = undefined; }
  if (!entry) {
    entry = { url, player: createAudioPlayer(url, { updateInterval: 100 }) };
    // Preparing a source is best effort, bounded, and never starts playback.
    const prepared = entry;
    entry.expiry = setTimeout(() => {
      if (active?.entry !== prepared && !prepared.player.isLoaded) discard(prepared);
    }, AUDIO_LOAD_TIMEOUT_MS);
  }
  players.delete(url);
  players.set(url, entry);
  while (players.size > MAX_PREPARED_PLAYERS) {
    const oldest = [...players.values()].find((candidate) => candidate !== active?.entry && candidate !== entry);
    if (!oldest) break;
    discard(oldest);
  }
  return entry;
}

export function prepareAudio(source: PlaybackSource): void {
  const url = resolveAssetUrl(source.url);
  if (!url) return;
  try { getPlayer(url); } catch { /* The play action reports a retryable error. */ }
}

function releaseRequest(request: Request, discardPlayer = false) {
  request.playIssued = false;
  clearTimeout(request.timer);
  request.timer = undefined;
  request.subscription?.remove();
  request.subscription = undefined;
  if (request.entry) {
    const entry = request.entry;
    request.entry = undefined;
    try {
      entry.player.pause();
      // Removing a still-loading player prevents it from playing much later.
      if (discardPlayer || !entry.player.isLoaded) discard(entry);
    } catch { discard(entry); }
  }
  if (request.speechStarted) {
    request.speechStarted = false;
    speechBarrier = speechBarrier.catch(() => {}).then(() => Speech.stop());
    void speechBarrier.catch(() => {});
  }
}

export function stopAudio(owner?: symbol): void {
  if (owner && state.owner !== owner) return;
  const previous = active;
  active = undefined; // Invalidate callbacks before native pause/stop emits events.
  if (previous) releaseRequest(previous);
  publish(idle);
}

export function clearAudio(): void {
  stopAudio();
  [...players.values()].forEach(discard);
}

function finish(request: Request) {
  if (active !== request) return;
  active = undefined;
  // onDone has already removed the utterance; no global stop needed.
  request.speechStarted = false;
  releaseRequest(request);
  publish(idle);
}

function fail(request: Request, message: string) {
  if (active !== request) return;
  releaseRequest(request, true);
  if (!request.triedSpeech && request.source.fallbackToSpeech && request.source.text?.trim()) {
    void startSpeech(request);
    return;
  }
  update(request, 'error', message);
  active = undefined;
}

function watchLoading(request: Request) {
  update(request, 'loading');
  if (request.timer) return;
  request.timer = setTimeout(() => {
    fail(request, 'Audio could not start. Check your connection or device voice settings, then try again.');
  }, AUDIO_LOAD_TIMEOUT_MS);
}

function onStatus(request: Request, status: AudioStatus) {
  if (active !== request || !request.playIssued) return;
  if (status.error) { fail(request, 'Audio could not play. Tap to try again.'); return; }
  if (status.didJustFinish) { finish(request); return; }
  if (status.isBuffering || !status.isLoaded) { watchLoading(request); return; }
  if (status.playing) {
    clearTimeout(request.timer);
    request.timer = undefined;
    update(request, 'playing');
  } else if (state.status === 'playing') {
    // Headphones disconnected, audio focus lost, or another system interruption.
    finish(request);
  }
}

async function startSpeech(request: Request) {
  request.triedSpeech = true;
  watchLoading(request);
  try {
    // Expo Android queues utterances while its engine initializes; stop() does
    // not clear that pre-init queue. Wait for readiness before submitting any
    // utterance, so a cancelled first tap can never speak on a later screen.
    const [voices] = await Promise.all([initializeSpeech(), speechBarrier]);
    if (active !== request) return;
    const language = request.source.language?.replace(/_/g, '-').toLowerCase();
    const matches = voices.filter((voice) => !language
      || voice.language.replace(/_/g, '-').toLowerCase().split('-')[0] === language.split('-')[0]);
    const voice = matches.find((candidate) => candidate.language.replace(/_/g, '-').toLowerCase() === language) ?? matches[0];
    if (!voice) {
      voicesPromise = undefined;
      fail(request, 'No voice is installed for this language. Install a matching device voice, then try again.');
      return;
    }
    request.speechStarted = true;
    Speech.speak(request.source.text!.trim(), {
      language: request.source.language,
      voice: voice.identifier,
      onStart: () => {
        if (active !== request) return;
        clearTimeout(request.timer);
        request.timer = undefined;
        update(request, 'playing');
      },
      onDone: () => finish(request),
      onStopped: () => finish(request),
      onError: () => {
        voicesPromise = undefined;
        fail(request, 'Speech is unavailable. Check the voices installed on your device and try again.');
      },
    });
  } catch {
    fail(request, 'Speech is unavailable. Check the voices installed on your device and try again.');
  }
}

async function start(request: Request) {
  try {
    await Promise.all([initializeAudio(), speechBarrier]);
    if (active !== request) return;
    const url = resolveAssetUrl(request.source.url);
    if (!url) { await startSpeech(request); return; }
    const entry = getPlayer(url);
    request.entry = entry;
    clearTimeout(entry.expiry);
    // expo-audio leaves completed players at the end. Always rewind for replay.
    if (entry.player.currentTime > 0) await entry.player.seekTo(0);
    if (active !== request) return;
    request.subscription = entry.player.addListener('playbackStatusUpdate', (status) => onStatus(request, status));
    request.playIssued = true;
    entry.player.play();
    onStatus(request, entry.player.currentStatus);
  } catch {
    fail(request, 'Audio could not play. Tap to try again.');
  }
}

export function playAudio(source: PlaybackSource, owner: symbol): void {
  stopAudio();
  if (!audioSourceKey(source)) {
    publish({ owner, sourceKey: '', status: 'error', error: 'No audio is available for this item.' });
    return;
  }
  const request: Request = { owner, source };
  active = request;
  watchLoading(request); // Immediate visual response, before any asynchronous work.
  void start(request);
}
