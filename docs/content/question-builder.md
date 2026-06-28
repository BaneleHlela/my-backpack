# Building Questions — A Guide for Teachers

This guide walks through each category of question type and explains what a teacher needs to provide to create one. It covers what the teacher writes, what AI generates, and how to write quality content for each type.

🔜 **The question builder UI is not yet built.** This document describes the intended workflow once the teacher dashboard is live in Phase 3. Currently, all questions are generated programmatically via the admin API or seed scripts.

---

## How Question Creation Works

When a teacher creates a question in My Backpack, they provide the essential content — the prompt, the correct answer, and any context. The system then does the rest:

- For **multiple choice questions**, the teacher provides the correct answer and the system proposes distractor options using AI. The teacher reviews and approves.
- For **audio questions**, the teacher uploads or links to an audio file. The system wraps it in a question.
- For **drag-and-drop questions**, the teacher defines the draggable items and the correct placement. The system builds the interaction.
- For **typed input questions**, the teacher provides the correct answer string. The system handles exact-match grading.

The teacher is always the final gatekeeper — nothing goes live without approval.

---

## Multiple Choice Questions

### What the teacher provides
- The **prompt** (question text or sentence with blank)
- The **correct answer** (the definition, the term, or the correct sentence)
- Optionally: **distractor suggestions** (wrong options). If not provided, AI generates them for review.

### What AI generates
- 3 plausible distractor options (wrong answers that are clearly wrong but not absurd)
- A brief **explanation** shown after the learner answers

### How to write good distractors

Distractors must be wrong — but not obviously so. The goal is to challenge learners who don't fully know the answer, not to trick those who do.

**For `mcq_term_to_def` (show term, select definition):**
The distractors should be definitions of *other* words, not nonsense definitions. They should be in the same part of speech and at a similar complexity level to the correct answer.

Good distractor for "ephemeral": *Showing deep respect or reverence* (this is "venerate" — a real definition)  
Bad distractor: *A type of large purple fruit* (obviously unrelated, no challenge)

**For `mcq_correct_usage` (select sentence using word correctly):**
The distractor sentences should use the word in a way that *feels* plausible at first glance but is actually incorrect. The most effective distractors use the word in the wrong context, not in a way that makes no grammatical sense.

**Critical rule for multi-meaning words:** If a word has multiple meanings (like "bank"), every question about one specific definition must be unambiguously about that meaning. All distractors and the correct answer must be anchored to the same meaning — no distractor should be technically correct for a different meaning of the same word.

### Writing for children vs adults

**Children:** Use short sentences, simple vocabulary in examples, and familiar contexts (animals, family, school, food). Avoid abstract concepts or technical vocabulary in distractors.

**Adults:** Distractors can be nuanced, use academic vocabulary, and test subtle distinctions between near-synonyms.

---

## True/False Questions

### What the teacher provides
- A **term** and a **definition** (or a sentence using the term)
- Whether the pairing is true or false

### Notes
- The system generates both a "true" version and a "false" version automatically for every term+definition pair
- For false versions, the system uses a definition from a *different* term in the same mini-app as the incorrect pairing
- True/false questions are the simplest type — best used for introduction and early reinforcement, not as the primary question format

---

## Typed Input Questions

### What the teacher provides
- The **prompt** (a definition, an audio file path, or a sentence with blank)
- The **correct answer string** (the exact word or phrase)
- Optionally: accepted variations (alternative spellings, abbreviations)

### How grading works
Typed input questions use exact-match grading by default. The learner's response is compared character-by-character to the correct answer (case-insensitive). Partial credit is not awarded for typed input questions unless `pointsCanBePartial` is enabled.

### Tips for clear prompts
- Be specific about what you're asking for. "Type the missing word" is clear; "Fill in the blank" is vague if there's no blank visible.
- For `text_input_def`, the prompt is the full definition — make sure it uniquely identifies the correct term.
- Avoid prompts where more than one word could be a valid answer. If multiple answers are acceptable, list them as accepted variations.

---

## Fill-in-the-Blank Questions

### What the teacher provides
- An **example sentence** containing the target word
- The sentence is stored on the term's definition

### What the system generates automatically
- `mcq_fill_blank` — the sentence with the word removed, four options presented
- `fill_blank_typed` — the same sentence, learner types the word
- `text_input_example` — the same sentence, learner types the removed word

All three question types are generated from a single example sentence. This means a well-written example sentence produces three quality questions automatically.

### How to write good example sentences
- Use the word **naturally** — the sentence should feel like something a real person would write or say
- Make the **blank clearly point to the correct word** — the context should strongly imply the word without giving it away
- Keep sentences **realistic and contextually rich** — "The ___ flower wilted in the heat" is better than "The thing was ___."
- For children's content, use familiar, age-appropriate contexts (school, home, nature)

---

## Drag-and-Drop Questions

### What the teacher provides

**For all DnD types:**
- The **draggable items** — each item has an ID, a label (text or image), and optionally audio
- The **drop zones** — each zone has an ID, a label, and the list of correct draggable IDs for that zone

**For `dnd_fill` and `dnd_build` only:**
- A **sentence template** — the sentence with blanks marked (e.g. `"The ___ beauty of morning ___ is fleeting"`)

**For audio-based DnD (`mcq_audio` combined with DnD):**
- Audio file paths for each draggable item and/or the question prompt

### Tips for DnD content

**Keep it manageable.** Young children can handle 3–5 draggables comfortably. More than 6 becomes overwhelming and frustrating.

**Use clear labels.** DnD items are small. If an item is a letter, it should be large and legible. If it's a word, keep it short. If it's an image, it should be unambiguous.

**Think about partial credit.** A `dnd_sort` question where the learner places 4 out of 6 items correctly is a better result than the system marking the entire question wrong. Enable partial credit for complex DnD questions.

**Test the interaction.** Before approving a DnD question, mentally drag through it yourself. Is there any ambiguity about which item goes where? Are any zones confusingly labelled?

---

## Audio Questions

### What the teacher provides
- An **audio file** (MP3, 128kbps minimum)
- The **question prompt** — the `audio:` prefix followed by the GCS path, e.g. `audio:sounds/isizulu/vowels/a.mp3`
- For MCQ audio: the **correct answer** and **distractor options**

### Audio quality requirements
- Clear, isolated sound — no background noise, no echo
- Correct pronunciation — have a native speaker record IsiZulu audio
- Consistent volume across all audio files in a set
- File names: lowercase, hyphens, descriptive (e.g. `khetha-umsindo-a.mp3`)

### When to use audio questions
Audio questions are essential for:
- Phonics and sound recognition (IsiZulu vowels, consonants)
- Pronunciation (vocabulary with audio)
- Listening comprehension (children learning language through hearing first)

They are not appropriate for mathematics or purely text-based content.

---

*Last updated: June 2026*
