# Live TTS with Word Highlighting (Interim)

## Purpose

Read question prompts, avatar dialogue, and answer feedback aloud with live word
highlighting, using the browser's Web Speech API — free, zero backend cost, works
immediately. This is an interim measure until a pre-generated cloud-TTS pipeline
(Azure AI Speech, MP3 + word-timing JSON, authored via the future teacher dashboard)
replaces it.

## Library

`react-text-to-speech` — wraps the Web Speech API (`SpeechSynthesisUtterance`),
provides a `useSpeech` hook whose `<Text />` component highlights the word currently
being spoken in real time, and handles chunking text past the Web Speech API's
utterance length limit automatically. `DndSinglePattern` also uses the library's
`useSpeak` hook (no bound text — exposes an imperative `speak(text, options)`) to
read a draggable item's label on demand, since which item was tapped/dragged isn't
known until the click/drag-start event fires.

## Voice

All live TTS requests `voiceURI: 'Google US English'` (`DEFAULT_TTS_VOICE` in
`apps/web/src/lib/lang.ts`) — `react-text-to-speech` matches `voiceURI` against
`SpeechSynthesisVoice.voiceURI`, which Chrome sets equal to the voice's display
name, so this selects Chrome's bundled Google neural voice where installed. If the
browser doesn't have a voice by that exact name (non-Chrome browsers, or Chrome
without Google voices installed), the match silently fails and
`SpeechSynthesisUtterance` falls back to the browser/OS default voice — same
silent-fallback behavior as the `zu-ZA` limitation below, just for a different
cause. Forcing this one English voice for isiZulu content doesn't fix
mispronunciation (see Known limitation) but does at least make the fallback
voice consistent rather than whatever the browser happens to default to.

## Fallback rule — prerecorded audio always wins (except DndSinglePattern's dialogue)

Live TTS only fills gaps. It never plays where a prerecorded `audioUrl` already
exists (e.g. isiZulu vowels' `draggable.audioUrl`, `content.prompt`'s `audio:`
prefix, or `text_input_audio`'s fetched term audio). This avoids ever downgrading
existing high-quality recorded audio to a live synthesized voice, and avoids
duplicate/competing audio playback.

**Exception:** `DndSinglePattern`'s avatar dialogue (`content.avatar.dialogue`) is
the one deliberate override — its Replay control always speaks live via TTS, even
when `avatar.dialogueAudioUrl` is set. This was an explicit product decision (word
highlighting during the dialogue read-out was judged more valuable than the
prerecorded clip for this one control), not an oversight. `dialogueAudioUrl` is
otherwise unused by `DndSinglePattern` now — the field remains on the schema and
in seed data for potential future use, but nothing reads it today.

## Scope — where SpokenText/useSpeech is used

| Location | Existing text | Guard |
|---|---|---|
| `McqPattern`, `TrueFalsePattern` | `content.prompt` | skip if `content.prompt` starts with `audio:` |
| `TypedInputPattern` | `content.prompt` | skip if `promptIsAudio` (existing `audio:` prefix logic) or `type === 'text_input_audio'` (has its own fetched-audio flow) |
| `DndSinglePattern` | `content.avatar.dialogue` | none — always live TTS on Replay, regardless of `dialogueAudioUrl` (see exception above). Uses `useSpeech` directly (not the shared `SpokenText` component) so the existing Replay button can trigger `start()`/`stop()` itself. |
| `DndSinglePattern` | `draggable.label` (on tap or drag-start) | skip if `draggable.audioUrl` is set — this is the ordinary fallback rule, unlike the dialogue exception above, since draggable audio is often phonetically load-bearing (e.g. isiZulu vowel/consonant recordings) and shouldn't be silently replaced by a mispronounced TTS reading. Uses `useSpeak`'s imperative `speak()`, not `SpokenText`. |
| `AnswerFeedback` | `content.explanation` | none — no prerecorded equivalent exists for this field |
| `AnswerFeedback` | `feedback.text` (success/tryAgain) | skip live TTS if `feedback.audioUrl` is set (play that instead); **this field was previously never rendered as visible text at all — this pass makes it visible for the first time**, in addition to speakable |

## Language

Derived from the `subjectSlug` route param, already available at both places
questions render (`QuizPage.tsx`, `QuizItemPlayerPage.tsx`) — no new fetch needed.
`'isizulu-hl'` → `zu-ZA`, everything else → `en-US`. Computed once per page via
`subjectSlugToLangCode()` and threaded down as a `lang` prop through
`QuestionRenderer` → pattern components → `AnswerFeedback`.

## Playback trigger

Manual, via a small speaker-icon button — not autoplay. This matches the existing
convention (DnD's dialogue "Replay" button is manual, not autoplay-on-mount) and
avoids relying on `speechSynthesis.speak()` firing before any user gesture has
occurred on the page, which some browsers block.

## Not touched

`IFeedback.highlightWords` (an existing, currently-unused schema field for a
pre-authored word-highlight array) is left dormant. It appears scaffolded for a
different, pre-computed highlighting approach — not needed here, since
`react-text-to-speech` computes word highlighting live from the browser's speech
boundary events. No relation to this work; do not populate or wire it up.

## Known limitation

`zu-ZA` will silently fall back to a default (usually English) voice on devices
without an isiZulu voice installed, mispronouncing isiZulu text rather than erroring.
Accepted for this interim phase.

## Future replacement

When the teacher-dashboard-driven pre-generated audio pipeline lands, `SpokenText`'s
live-generation path is expected to become a last-resort fallback (or be retired
entirely) in favor of playing the generated MP3 + synced word-timing data. Not part
of this pass.
