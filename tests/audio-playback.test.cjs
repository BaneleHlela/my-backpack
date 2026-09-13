// Native events are controlled here to reproduce slow networks, fast taps and
// callbacks arriving after navigation. No device, network, or database required.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const { runInThisContext } = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = createRequire(path.join(root, 'apps/mobile/package.json'))('typescript');
function load(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const localRequire = createRequire(filename);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const module = { exports: {} };
  runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name), module, module.exports
  );
  return module.exports;
}
const assets = load('apps/mobile/src/lib/assetUrl.ts', { '@my-backpack/shared': { ASSETS: { GCS_BASE: 'https://assets.example.test' } } });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(t, options = {}) {
  const created = [], utterances = [], events = [];
  const audio = load('apps/mobile/src/lib/audio.ts', {
    './assetUrl': assets,
    'expo-audio': {
      setAudioModeAsync: (mode) => { events.push(['mode', mode]); return options.mode?.() ?? Promise.resolve(); },
      createAudioPlayer: (url) => {
        const callbacks = new Set();
        const player = {
          currentTime: 0, isLoaded: options.loaded ?? false, removed: false,
          currentStatus: { playing: false, isLoaded: options.loaded ?? false, isBuffering: false, error: null },
          addListener: (_name, callback) => { callbacks.add(callback); return { remove: () => callbacks.delete(callback) }; },
          emit(status) {
            this.currentStatus = { ...this.currentStatus, ...status };
            if (status.isLoaded !== undefined) this.isLoaded = status.isLoaded;
            if (status.currentTime !== undefined) this.currentTime = status.currentTime;
            [...callbacks].forEach((callback) => callback(this.currentStatus));
          },
          play() { assert.equal(this.removed, false); events.push(['play', url]); },
          pause() { events.push(['pause', url]); },
          seekTo(time) {
            events.push(['seek', url, time]);
            this.currentTime = time;
            this.currentStatus = { ...this.currentStatus, didJustFinish: false, playing: false };
            return options.seek?.() ?? Promise.resolve();
          },
          remove() { this.removed = true; events.push(['remove', url]); },
        };
        created.push(player);
        return player;
      },
    },
    'expo-speech': {
      getAvailableVoicesAsync: () => options.voices?.() ?? Promise.resolve([
        { identifier: 'english', language: 'en-US' }, { identifier: 'zulu', language: 'zu-ZA' },
      ]),
      speak: (text, callbacks) => { events.push(['speak', text]); utterances.push({ text, ...callbacks }); },
      stop: () => { events.push(['stop-speech']); return options.stopSpeech?.() ?? Promise.resolve(); },
    },
  });
  t.after(() => audio.clearAudio());
  return { ...audio, created, utterances, events };
}

test('source resolution preserves absolute/local URLs and normalizes GCS paths', () => {
  for (const url of ['https://cdn.example.test/word.mp3', 'file:///cache/audio.mp3', 'content://audio/1', 'data:audio/mp3;base64,AA', 'blob:clip']) {
    assert.equal(assets.resolveAssetUrl(` ${url} `), url);
  }
  assert.equal(assets.resolveAssetUrl('//cdn.example.test/a.mp3'), 'https://cdn.example.test/a.mp3');
  assert.equal(assets.resolveAssetUrl('/sounds/a.mp3'), 'https://assets.example.test/sounds/a.mp3');
  assert.equal(assets.resolveAssetUrl(' '), undefined);
});

test('recordings show immediate loading, actual playback, buffering and completion', async (t) => {
  const h = harness(t);
  h.playAudio({ url: 'sounds/a.mp3' }, Symbol());
  assert.equal(h.getPlaybackState().status, 'loading');
  await flush();
  const player = h.created[0];
  player.emit({ playing: true, isLoaded: false, isBuffering: true });
  assert.equal(h.getPlaybackState().status, 'loading');
  player.emit({ playing: true, isLoaded: true, isBuffering: false });
  assert.equal(h.getPlaybackState().status, 'playing');
  player.emit({ isBuffering: true });
  assert.equal(h.getPlaybackState().status, 'loading');
  player.emit({ playing: true, isLoaded: true, isBuffering: false });
  player.emit({ didJustFinish: true });
  assert.equal(h.getPlaybackState().status, 'idle');
});

test('a new tap releases a buffering clip and stale callbacks cannot play it later', async (t) => {
  const h = harness(t);
  const a = Symbol(), b = Symbol();
  h.playAudio({ url: 'old.mp3' }, a);
  await flush();
  h.playAudio({ url: 'new.mp3' }, b);
  assert.equal(h.created[0].removed, true);
  await flush();
  h.created[0].emit({ isLoaded: true, playing: true });
  assert.equal(h.getPlaybackState().owner, b);
  assert.equal(h.getPlaybackState().status, 'loading');
  h.created[1].emit({ isLoaded: true, playing: true });
  h.stopAudio(a); // A disappearing old control must not stop B.
  assert.equal(h.getPlaybackState().status, 'playing');
});

test('navigation while audio mode is initializing prevents any late playback', async (t) => {
  const mode = deferred();
  const h = harness(t, { mode: () => mode.promise });
  h.playAudio({ url: 'late.mp3' }, Symbol());
  h.clearAudio();
  mode.resolve();
  await flush();
  assert.equal(h.created.length, 0);
  assert.equal(h.getPlaybackState().status, 'idle');
});

test('preparing never plays and replay reuses the loaded player after rewinding', async (t) => {
  const h = harness(t, { loaded: true });
  h.prepareAudio({ url: 'short.mp3' });
  assert.equal(h.events.some((event) => event[0] === 'play'), false);
  h.playAudio({ url: 'short.mp3' }, Symbol());
  await flush();
  h.created[0].emit({ isLoaded: true, playing: false, currentTime: 1, didJustFinish: true });
  h.playAudio({ url: 'short.mp3' }, Symbol());
  await flush();
  assert.equal(h.created.length, 1);
  assert.equal(h.events.filter((event) => event[0] === 'play').length, 2);
  assert.ok(h.events.some((event) => event[0] === 'seek' && event[2] === 0));
});

test('cancelling while replay seek is pending prevents a late play', async (t) => {
  const seek = deferred();
  const h = harness(t, { loaded: true, seek: () => seek.promise });
  h.prepareAudio({ url: 'replay.mp3' });
  h.created[0].currentTime = 1;
  h.playAudio({ url: 'replay.mp3' }, Symbol());
  await flush();
  h.stopAudio();
  seek.resolve();
  await flush();
  assert.equal(h.events.some((event) => event[0] === 'play'), false);
});

test('speech only becomes playing onStart, and fast taps replace pending utterances', async (t) => {
  const stop = deferred();
  const h = harness(t, { stopSpeech: () => stop.promise });
  h.playAudio({ text: 'first', language: 'en-US' }, Symbol());
  await flush();
  assert.equal(h.getPlaybackState().status, 'loading');
  h.utterances[0].onStart();
  assert.equal(h.getPlaybackState().status, 'playing');
  h.playAudio({ text: 'second' }, Symbol());
  h.playAudio({ text: 'third' }, Symbol());
  await flush();
  assert.deepEqual(h.utterances.map((u) => u.text), ['first']);
  stop.resolve();
  await flush();
  assert.deepEqual(h.utterances.map((u) => u.text), ['first', 'third']);
  h.utterances[0].onDone();
  assert.equal(h.getPlaybackState().status, 'loading');
  h.utterances[1].onStart();
  h.utterances[0].onStopped();
  assert.equal(h.getPlaybackState().status, 'playing');
  h.utterances[1].onDone();
  assert.equal(h.getPlaybackState().status, 'idle');
});

test('switching from speech to a clip waits for speech cancellation', async (t) => {
  const stop = deferred();
  const h = harness(t, { stopSpeech: () => stop.promise });
  h.playAudio({ text: 'read' }, Symbol());
  await flush();
  h.playAudio({ url: 'word.mp3' }, Symbol());
  await flush();
  assert.equal(h.created.length, 0);
  stop.resolve();
  await flush();
  assert.equal(h.created.length, 1);
});

test('a stalled clip times out, releases resources and supports retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(t);
  const owner = Symbol();
  h.playAudio({ url: 'stalled.mp3' }, owner);
  await flush();
  t.mock.timers.tick(h.AUDIO_LOAD_TIMEOUT_MS);
  assert.equal(h.getPlaybackState().status, 'error');
  assert.equal(h.created[0].removed, true);
  h.created[0].emit({ playing: true, isLoaded: true });
  assert.equal(h.getPlaybackState().status, 'error');
  h.playAudio({ url: 'stalled.mp3' }, owner);
  await flush();
  h.created[1].emit({ playing: true, isLoaded: true });
  assert.equal(h.getPlaybackState().status, 'playing');
});

test('dictionary failures can speak the word; phonics failures never substitute a different sound', async (t) => {
  const h = harness(t);
  h.playAudio({ url: 'dictionary.mp3', text: 'cat', fallbackToSpeech: true }, Symbol());
  await flush();
  h.created[0].emit({ error: '404' });
  await flush();
  assert.equal(h.utterances[0].text, 'cat');
  h.utterances[0].onDone();
  h.playAudio({ url: 'phonics.mp3', text: 'a', language: 'zu-ZA' }, Symbol());
  await flush();
  h.created[1].emit({ error: '404' });
  assert.equal(h.getPlaybackState().status, 'error');
  assert.equal(h.utterances.length, 1);
});

test('speech errors and startup timeouts surface a retry instead of a stuck playing state', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(t);
  h.playAudio({ text: 'word', language: 'zu-ZA' }, Symbol());
  await flush();
  h.utterances[0].onError(new Error('No voice'));
  assert.equal(h.getPlaybackState().status, 'error');
  h.playAudio({ text: 'other' }, Symbol());
  await flush();
  t.mock.timers.tick(h.AUDIO_LOAD_TIMEOUT_MS);
  await flush();
  h.utterances[1].onStart();
  assert.equal(h.getPlaybackState().status, 'error');
});

test('prepared players are bounded and all resources are released on leaving the screen', (t) => {
  const h = harness(t, { loaded: true });
  for (let i = 0; i < 15; i++) h.prepareAudio({ url: `clip-${i}.mp3` });
  assert.equal(h.created.filter((p) => !p.removed).length, 6);
  h.clearAudio();
  assert.ok(h.created.every((p) => p.removed));
});

const sources = load('apps/mobile/src/lib/questionAudio.ts', { './assetUrl': assets });
test('listening questions resolve embedded recordings and old answer-word fallback without fetching term details', () => {
  const content = { prompt: 'Listen and type the word', correctAnswer: 'cat', promptAudioUrl: 'https://cdn.example.test/cat.mp3' };
  assert.equal(sources.listeningAudioSource(content, 'en-US', true).url, content.promptAudioUrl);
  const legacy = sources.listeningAudioSource({ prompt: content.prompt, correctAnswer: 'cat' }, 'en-US', true);
  assert.equal(legacy.text, 'cat');
  assert.notEqual(legacy.text, content.prompt);
  const encoded = sources.listeningAudioSource({ ...content, prompt: 'audio:sounds/letter.mp3' }, 'zu-ZA', false);
  assert.equal(encoded.url, 'https://assets.example.test/sounds/letter.mp3');
  assert.equal(encoded.text, undefined);
  assert.equal(encoded.fallbackToSpeech, false);
});

test('replay supports prompt recordings even when avatar dialogue has no recording', () => {
  const source = sources.replayAudioSource({ promptAudioUrl: 'prompt.mp3', avatar: { dialogue: 'Read this' } }, 'en-US');
  assert.equal(source.url, 'https://assets.example.test/prompt.mp3');
  assert.equal(sources.replayAudioSource({ prompt: 'Read this' }, 'en-US').text, 'Read this');
  assert.equal(sources.replayAudioSource({ prompt: 'audio:phonics.mp3' }, 'en-US').text, undefined);
});

test('the generator includes the term recording in new listening questions', () => {
  const { generateNonAiQuestions } = load('apps/api/src/services/questionGeneration/nonAiGenerator.ts');
  const questions = generateNonAiQuestions({ word: 'cat', audioUrl: 'https://cdn.example.test/cat.mp3' }, { definition: 'animal' }, [], []);
  const question = questions.find((q) => q.type === 'text_input_audio');
  assert.equal(question.content.promptAudioUrl, 'https://cdn.example.test/cat.mp3');
  assert.equal(question.content.correctAnswer, 'cat');
});

test('the API enriches legacy listening questions and preserves explicitly authored recordings', async () => {
  let calls = 0;
  const { attachQuestionAudio } = load('apps/api/src/services/questionAudio.service.ts', {
    '../models/apps/language/vocabulary/term.model': { findById: () => {
      calls++;
      return { select: () => ({ lean: async () => ({ audioUrl: 'https://cdn.example.test/cat.mp3' }) }) };
    } },
  });
  const legacy = { type: 'text_input_audio', termId: 'term1', content: { prompt: 'Listen', correctAnswer: 'cat' } };
  const result = await attachQuestionAudio(legacy);
  assert.equal(result.content.promptAudioUrl, 'https://cdn.example.test/cat.mp3');
  await attachQuestionAudio(result);
  await attachQuestionAudio({ ...legacy, content: { prompt: 'audio:custom.mp3' } });
  await attachQuestionAudio({ type: 'mcq_general', content: {} });
  assert.equal(await attachQuestionAudio(null), null);
  assert.equal(calls, 1);
});


test('a cancelled tap is never submitted to Android while the speech engine is initializing', async (t) => {
  const voices = deferred();
  const h = harness(t, { voices: () => voices.promise });
  h.playAudio({ text: 'old prompt', language: 'en-US' }, Symbol());
  await flush();
  assert.equal(h.utterances.length, 0);
  h.clearAudio();
  voices.resolve([{ identifier: 'english', language: 'en-US' }]);
  await flush();
  assert.equal(h.utterances.length, 0);
  assert.equal(h.getPlaybackState().status, 'idle');
});

test('a requested language never silently falls back to an unrelated device voice', async (t) => {
  const h = harness(t, { voices: async () => [{ identifier: 'english', language: 'en-US' }] });
  h.playAudio({ text: 'sawubona', language: 'zu-ZA' }, Symbol());
  await flush();
  assert.equal(h.utterances.length, 0);
  assert.equal(h.getPlaybackState().status, 'error');
  h.playAudio({ text: 'hello', language: 'en-GB' }, Symbol());
  await flush();
  assert.equal(h.utterances[0].voice, 'english');
});


test('optional legacy audio enrichment cannot fail an already-recorded quiz answer', async () => {
  const { attachQuestionAudio } = load('apps/api/src/services/questionAudio.service.ts', {
    '../models/apps/language/vocabulary/term.model': { findById: () => ({
      select: () => ({ lean: async () => { throw new Error('Temporary lookup failure'); } }),
    }) },
  });
  const question = { type: 'text_input_audio', termId: 't1', content: { correctAnswer: 'cat' } };
  assert.equal(await attachQuestionAudio(question), question);
});
