# Mobile audio playback

`apps/mobile/src/lib/audio.ts` owns short recordings and device speech. All mobile
audio controls use `AudioButton` or the lifecycle-owned `usePlayback` hook.
Lesson video players continue to use their media controls.

- Only one request can play. A new tap cancels the previous recording or utterance,
  including loading requests. Stale callbacks cannot start audio on a later screen.
- Controls show loading immediately, animate a waveform only during actual playback,
  and let the learner cancel/stop or retry an error. The waveform respects reduced motion.
- Question recordings are prepared before tapping; a bounded cache retains up to six
  native players. Replay seeks to the beginning. Failed/loading players are released
  on cancellation, and route changes/backgrounding clear the cache.
- An eight-second startup/buffering timeout prevents indefinite loading. Dictionary
  pronunciation may fall back to speaking the word. Authored phonics recordings never
  silently substitute a different sound; a missing recording produces a visible error.
- Speech engine initialization is warmed at app startup using `getAvailableVoicesAsync`.
  No utterance is submitted until that resolves. In the installed Expo 57 Android
  implementation, `stop()` does not clear the utterance queue held during initialization.
  Waiting first avoids cancelled prompts playing when initialization finally completes.
- Speech uses an installed voice matching the requested language (exact locale first,
  then another locale of the same language). Unsupported languages show an error.
  Native `stop()` is awaited before subsequent playback to prevent cancellation races.

`text_input_audio` now uses its embedded `promptAudioUrl`, or the legacy `audio:`
prompt URL. New generated questions include the term recording, and the API attaches
it to old questions returned as the first/next question without saving those documents.
Mobile no longer fetches the full term-detail endpoint just to play a word. On an older
API or when the dictionary recording fails, it can speak `correctAnswer`; that text is
never rendered in the audio button or its accessibility label.

Drag/drop replay uses avatar recording, question recording, then spoken dialogue/prompt
when no recording exists. Audio-only feedback also gets a control. Spoken prompts with
a recording show one playback control. Dictionary pronunciation controls stop press
propagation so tapping them does not open the word detail screen.

The implementation uses the existing Expo packages; no native dependency upgrade or
database migration is required. Deploying the API change supplies recordings for old
listening questions; the mobile fallback also works against the previous API.

## Verification

Run from the repository root:

```sh
pnpm test
pnpm --filter @my-backpack/mobile exec tsc --noEmit
pnpm --filter @my-backpack/api exec tsc --noEmit --ignoreDeprecations 6.0
pnpm --filter @my-backpack/mobile exec expo export --platform android
```

The audio regression suite controls actual controller inputs and native event mocks:
slow loads, fast taps, replay/seek, cancellation, late callbacks, engine initialization,
voice errors, source selection, cache disposal and generated/legacy listening questions.
It does not verify speakers or CDN availability. Device checks still needed: Android
speaker/Bluetooth playback, navigating while loading, iOS silent mode, and the actual
hosted Merriam-Webster/GCS recordings. CDN requests from the implementation environment
timed out at its network proxy, so no claim about missing/available production files was made.

Reference: [Expo 57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/) and
[Expo 57 speech](https://docs.expo.dev/versions/v57.0.0/sdk/speech/).
