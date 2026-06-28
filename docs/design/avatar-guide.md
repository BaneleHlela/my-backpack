# Avatar Characters — Guide

Avatars are one of the most important elements in My Backpack's learner experience — particularly for young children. A well-designed avatar makes learning feel like a conversation with a friendly guide, not like sitting a test. This document covers the purpose, emotion states, dialogue writing, audio requirements, and technical conventions for avatar characters.

---

## Purpose of Avatars

Avatars exist to make the learning experience feel human and personal.

Without an avatar, a quiz is a series of questions and answers. With a well-written avatar, it becomes a conversation: the avatar introduces the task, reacts to the learner's responses, offers encouragement, and celebrates success. This distinction matters enormously for young children, who engage much more readily with a character than with text on a screen.

Avatars serve these specific functions:

- **Introduce each question** — set the scene, frame what the learner needs to do
- **React to correct answers** — celebrate, affirm, and reinforce what was learned
- **React to incorrect answers** — encourage, redirect, and never shame
- **Guide the learner** — explain the task if the learner is confused, offer hints when helpers are enabled
- **Maintain energy** — keep the session feeling alive and interactive, not mechanical

---

## Emotion States

Each avatar has a set of emotion states that are triggered by what happens during a session:

| Emotion | When it triggers | What the learner sees |
|---|---|---|
| **Happy / Neutral** | Default state between questions | Avatar is calm, smiling, waiting |
| **Excited** | Correct answer received | Animation: jump, sparkle, or cheer |
| **Thinking** | Question is introduced; learner is deciding | Avatar looks thoughtful, tilts head |
| **Encouraging** | Wrong answer received | Avatar looks warm, gestures "try again" |
| **Celebrating** | Node completed; high score; milestone | Big celebration animation |

🔜 Rive animations for avatars are planned for a future phase. Currently, avatar states are represented by static images with CSS transitions. The emotion state is set via the `avatar.emotion` field in `IQuestionContent`.

---

## Dialogue Writing Guide

Avatar dialogue is what the learner actually reads (or hears). Getting it right is critical.

### For children's content

**Keep it short.** Aim for under 15 words per line. Children lose attention if the avatar talks too much.

```
✅ "Listen carefully! Which sound did you hear? 👂"
❌ "Please listen attentively to the audio that is about to play and then select the correct option from the choices provided below."
```

**Always in the positive.** Reframe everything as something the learner *can* do, not something they *failed* to do.

```
✅ "Oops! Let's try again — you're so close! 🎶"
❌ "That's wrong."
```

**Use the learner's name.** Profile names are available — use them for personalisation.

```
✅ "Well done, Siya! You found the letter A! ⭐"
✅ "Lebo, try listening one more time 🎵"
```

**Celebrate specifically.** Tell the learner *what* they got right, not just that they got something right.

```
✅ "Yes! That's the vowel A — it sounds like 'ah'!"
❌ "Correct!"
```

**Match the learner's language.** If the content is in IsiZulu, the avatar should respond in IsiZulu where possible. For bilingual content, code-switching is natural and appropriate.

```
✅ "Yebo! Lokho kulungile! That's the A sound! 🎉"
```

### For adult content

- Keep dialogue brief — adults don't need as much scaffolding
- Celebrate without being patronising
- A simple "Correct — ephemeral means lasting only a short time" is better than an over-the-top celebration
- Explanations after wrong answers should be informative, not condescending

### Good vs bad dialogue examples

| Context | Bad | Good |
|---|---|---|
| Introducing a question (child) | "Select the correct answer from the options below." | "Which letter is this? Find it! 🔍" |
| Correct answer (child) | "Correct! ✓" | "Yes! That's the letter U! Great listening, Siya! 🎊" |
| Wrong answer (child) | "Incorrect. Try again." | "Almost! Listen to the sound one more time 🎵" |
| Introducing a question (adult) | "Please select the definition that matches the term shown." | "What does 'ephemeral' mean?" |
| Correct answer (adult) | "Correct answer selected." | "Exactly — fleeting, short-lived. Well remembered." |
| Wrong answer (adult) | "Incorrect." | "Not quite. Ephemeral means lasting only a short time." |

---

## Audio Requirements

Every avatar dialogue line should have a corresponding audio file so children who cannot read can still follow the avatar.

**Format:** MP3  
**Minimum quality:** 128kbps  
**Voice requirements:**
- Warm, clear, energetic — not monotone
- Native or fluent speaker for IsiZulu content
- Child-appropriate pacing — slightly slower than normal adult speech for young learners
- Consistent energy across the full session — don't record on different days and end up with mismatched tone

**File naming convention:**
```
[language]-[context]-[emotion]-[brief-description].mp3

Examples:
en-vocab-correct-well-done-siya.mp3
zu-sounds-encourage-listen-again.mp3
en-adult-correct-ephemeral-exact.mp3
```

Files are stored in Google Cloud Storage at the asset path appropriate to the mini-app.

---

## AvatarId Convention

Each question's `content.avatar` field specifies which avatar character to show and what emotion to display.

```typescript
interface IAvatarConfig {
  avatarId: string;   // identifies which character (e.g. "tutor-1", "friend-a")
  emotion: 'happy' | 'excited' | 'thinking' | 'encouraging' | 'celebrating';
  dialogue: string;   // the text the avatar says
  audioUrl?: string;  // GCS path to the audio for this dialogue line
}
```

**AvatarId format:** `[role]-[identifier]`

Examples:
- `tutor-1` — the main tutor character, first variant
- `friend-a` — a peer friend character, variant A
- `guide-zulu` — an IsiZulu-specific guide character

The specific avatar characters, their designs, and their full identifier list are to be defined as part of the Phase 2 design work.

---

## Current State of Avatar Implementation

**Profile avatars:** DiceBear-generated avatars are used for profile images on the profile selector screen. These are automatically generated from the profile's ID and are not the same as lesson avatars.

**Lesson avatars:** The data model fully supports avatar configuration on every question (`content.avatar`). The frontend rendering of animated avatar characters is pending as part of Phase 2 UI development.

🔜 Rive animations for avatars are planned for a future phase. Rive is an animation format that supports interactive, state-machine-driven animations — perfect for avatars that transition smoothly between emotion states in response to learner actions.

---

*Last updated: June 2026*
