# Question Types Reference

My Backpack supports 21 question types across two categories: text-based questions and drag-and-drop (DnD) questions. Every question type is designed to test a different aspect of understanding — recognition, production, contextual use, or ordering.

All question data lives in the `content` field of the Question document (a `Schema.Types.Mixed` field). Always cast to `IQuestionContent` immediately after retrieval. The full TypeScript interface is defined in `apps/api/src/modules/question/question.types.ts`.

---

## Text-Based Questions

### `mcq_term_to_def` — Show Term, Select Definition

**Description:** The learner is shown a word and must choose the correct definition from four options.

**Example:**
```
Prompt: "ephemeral"
Options:
  A) Lasting for only a short time ✓
  B) Causing great damage or harm
  C) Showing a deep respect or reverence
  D) Expressed without words, through gestures
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Auto (no AI required)  
**Helpers:** Supports hint, audio playback  
**When to use:** The most basic vocabulary question — tests whether the learner can match a word to its meaning. A good starting point for any new term.

---

### `mcq_def_to_term` — Show Definition, Select Term

**Description:** The reverse of `mcq_term_to_def`. The learner sees a definition and must identify which word it describes.

**Example:**
```
Prompt: "Lasting for only a short time"
Options:
  A) ephemeral ✓
  B) belligerent
  C) venerate
  D) tacit
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Auto  
**Helpers:** Supports hint  
**When to use:** Tests recall in the opposite direction — harder than `mcq_term_to_def` because the learner must produce the word rather than recognise it.

---

### `mcq_correct_usage` — Select Sentence Using Word Correctly

**Description:** The learner sees four sentences and must identify which one uses the target word correctly.

**Example:**
```
Prompt: "Which sentence uses 'ephemeral' correctly?"
Options:
  A) The ephemeral beauty of cherry blossoms makes them precious. ✓
  B) She had an ephemeral memory that never forgot a single face.
  C) The ephemeral bridge was built to last a hundred years.
  D) He spoke in an ephemeral voice that could be heard across the hall.
```

**Default maxPoints:** 5  
**Available for:** teen, adult  
**Generation:** AI (requires Claude to generate plausible distractors)  
**Helpers:** Supports hint, explanation  
**When to use:** Tests whether the learner understands how to use the word, not just what it means. Especially useful for words that are commonly misused.

---

### `mcq_incorrect_usage` — Select Sentence Using Word Incorrectly

**Description:** The learner sees four sentences and must identify which one uses the word incorrectly. More difficult than `mcq_correct_usage` because one wrong answer must be spotted among mostly correct ones.

**Example:**
```
Prompt: "Which sentence uses 'ephemeral' incorrectly?"
Options:
  A) His fame was ephemeral — forgotten within a week of his retirement.
  B) The ephemeral nature of social media trends is well documented.
  C) She was an ephemeral woman whose wisdom shaped generations. ✓
  D) The morning mist is ephemeral, disappearing as the sun rises.
```

**Default maxPoints:** 7  
**Available for:** adult  
**Generation:** AI  
**Helpers:** Supports hint, explanation  
**When to use:** Use for advanced learners who already have basic understanding. Requires nuanced knowledge of connotation and register, not just definition.

---

### `mcq_fill_blank` — Sentence with Blank, Select Correct Word

**Description:** A sentence is shown with a blank. The learner selects which word correctly fills the blank from four options.

**Example:**
```
Prompt: "The joy of a sandcastle is ___; the tide will wash it away by morning."
Options:
  A) ephemeral ✓
  B) permanent
  C) substantial
  D) profound
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Auto (if an example sentence exists in the definition) or AI  
**Helpers:** Supports hint, audio  
**When to use:** Contextual understanding without requiring free-form typing. Good for solidifying vocabulary in natural sentence contexts.

---

### `mcq_audio` — Audio Prompt, Select Correct Answer

**Description:** The learner hears audio and must answer a question about what they heard. Used for language sounds (IsiZulu vowels) and word pronunciation.

**Example:**
```
Prompt: "audio:sounds/isizulu/vowels/a.mp3"
→ Frontend plays the audio
Options:
  A) a ✓
  B) e
  C) i
  D) o
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Auto (where audioUrl exists)  
**Helpers:** Supports replay audio button  
**When to use:** Essential for phonics and pronunciation content. The `audio:` prefix on the prompt tells the frontend to play audio instead of displaying text.

---

### `fill_blank_typed` — Sentence with Blank, Type the Word

**Description:** The learner sees a sentence with a blank and must type the exact word that belongs there.

**Example:**
```
Prompt: "The joy of a sandcastle is ___; the tide will wash it away by morning."
Expected: "ephemeral"
```

**Default maxPoints:** 6  
**Available for:** child (simplified sentences), teen, adult  
**Generation:** Auto (reuses the same example sentence as `mcq_fill_blank`)  
**Helpers:** Supports hint (first letter), keyboard display for young learners  
**When to use:** Harder than MCQ fill-blank because there are no options to choose from. Tests active retrieval. Best used after the learner has encountered the word in multiple other question formats.

---

### `true_false_term_def` — Is This the Correct Definition?

**Description:** The learner is shown a term and a definition. They must decide whether the definition is correct for that term.

**Example:**
```
Prompt: "Is this the correct definition of 'ephemeral'?"
Definition shown: "Lasting for only a short time"
Answer: True ✓
```

Or with a wrong definition:
```
Definition shown: "Showing a deep respect or reverence"
Answer: False ✓
```

**Default maxPoints:** 2  
**Available for:** child, teen, adult  
**Generation:** Auto (generates two questions per term+definition — one true, one false)  
**Helpers:** Supports explanation  
**When to use:** Good for introducing a new term. Low-stakes, binary choice with quick feedback. Generates 2 questions per definition automatically.

---

### `true_false_def_term` — Is This the Correct Term?

**Description:** The reverse of `true_false_term_def`. The learner sees a definition and a word, and decides if they match.

**Default maxPoints:** 2  
**Available for:** child, teen, adult  
**Generation:** Auto (generates two questions per definition)  
**When to use:** Similar to `true_false_term_def` but in the reverse direction. Good for reinforcement in the early stages of learning a term.

---

### `true_false_usage` — Is the Word Used Correctly?

**Description:** The learner sees a sentence using the target word and decides whether the usage is correct.

**Example:**
```
Prompt: "Is the word used correctly in this sentence?"
Sentence: "The ephemeral glacier has stood for ten thousand years."
Answer: False ✓
```

**Default maxPoints:** 3  
**Available for:** teen, adult  
**Generation:** AI  
**Helpers:** Supports explanation  
**When to use:** Tests contextual understanding at a binary level. Less complex than `mcq_correct_usage` but still requires real comprehension.

---

### `text_input_def` — See Definition, Type the Term

**Description:** The learner reads a definition and must type the exact word it describes.

**Example:**
```
Prompt: "Lasting for only a short time"
Expected: "ephemeral"
```

**Default maxPoints:** 5  
**Available for:** teen, adult  
**Generation:** Auto  
**Helpers:** Supports first-letter hint  
**When to use:** The purest test of recall — no options, no context, just the definition. Use once the learner has seen the term in multiple formats.

---

### `text_input_audio` — Hear Audio, Type the Term

**Description:** The learner hears audio of the word and must type what they heard.

**Example:**
```
Prompt: "audio:content/vocab/ephemeral.mp3"
Expected: "ephemeral"
```

**Default maxPoints:** 5  
**Available for:** teen, adult  
**Generation:** Auto (only if `term.audioUrl` exists)  
**Helpers:** Supports replay audio button  
**When to use:** Tests the learner's ability to map a sound to a spelling. Particularly useful for vocabulary with unusual phonetics.

---

### `text_input_example` — Example with Word Removed, Type the Term

**Description:** The learner sees an example sentence with the target word removed and must type it back.

**Example:**
```
Prompt: "The joy of a sandcastle is ___; the tide will wash it away by morning."
Expected: "ephemeral"
```

**Default maxPoints:** 5  
**Available for:** teen, adult  
**Generation:** Auto (reuses example sentence from definition) or AI (if no example exists)  
**Helpers:** Supports first-letter hint  
**When to use:** Combines contextual understanding with active production. Good as a capstone question type after the learner has been through other formats.

---

## Drag-and-Drop Questions

DnD questions use three sub-documents inside `content`:
- `draggables` — the items the learner can drag
- `dropZones` — the targets they drag items into
- `sentenceTemplate` — for `dnd_fill` and `dnd_build`, the sentence structure

The rawResponse format for all DnD answers:
```json
{ "placements": [{ "draggableId": "...", "dropZoneId": "..." }] }
```

**Illustration fields:** `content.dragAreaImageUrl` sets a background image for the
whole drag-and-drop widget (draggable tray + drop zone), distinct from
`content.dropZones[].imageUrl` which backgrounds a single zone only.
`IFeedback.avatarEmotion` (on `successFeedback` / `tryAgainFeedback`) sets which
emotion `content.avatar`'s character shows when that feedback fires — same
`avatarId`, different expression. Not every avatar has the full emotion set (e.g.
`miss-tutor` has no `'excited'` asset) — check available art in
`avatar/{avatarId}/` before assigning an emotion to new dialogue.

---

### `dnd_single` — Drag One Item to One Zone

**Description:** The simplest DnD type. One item, one zone, one decision. Drag the correct item into the target.

**Example (IsiZulu):**
```
Audio plays: "a"
→ Drag the letter "a" into the highlighted zone
Draggables: [a, e, i, o, u]
Drop zone: "The vowel you heard"
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Manual  
**Helpers:** Supports audio replay, visual hint (highlight correct item)  
**When to use:** Ideal for young children who are just learning to interact with DnD. Keep distractors visual and obvious. Used in the IsiZulu sounds roadmap.

---

### `dnd_select` — Drag Correct Item from Multiple Options to One Zone

**Description:** Multiple items are available, but only one is correct. The learner must identify and drag the right one.

**Example:**
```
Prompt: "Drag the word that means 'lasting only a short time'"
Draggables: [ephemeral, permanent, eternal, fleeting]
Drop zone: "Correct word"
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Manual / AI  
**Helpers:** Supports hint  
**When to use:** A DnD equivalent of MCQ. Good for visual learners and young children who respond better to dragging than clicking.

---

### `dnd_count` — Drag a Specific Quantity of Items to a Zone

**Description:** The learner must drag exactly N items that meet a criterion into a zone.

**Example (Mathematics):**
```
Prompt: "Drag 3 items from the fruit pile into the basket"
Draggables: [apple, orange, banana, car, dog, ball]
Drop zone: "Basket (add exactly 3 fruits)"
```

**Default maxPoints:** 4  
**Available for:** child, teen, adult  
**Generation:** Manual  
**Helpers:** Supports counter display  
**When to use:** Counting and quantity tasks. Most useful in Mathematics and early numeracy. Grading is based on both the correct items and the correct quantity.

---

### `dnd_sort` — Sort Items into Category Zones

**Description:** Multiple items, multiple zones. Each item must be placed in the correct category.

**Example (IsiZulu):**
```
Prompt: "Sort the sounds into vowels and consonants"
Draggables: [a, b, e, m, i, n, o, l, u]
Drop zones: ["Vowels", "Consonants"]
```

**Default maxPoints:** 5  
**Available for:** child, teen, adult  
**Generation:** Manual  
**Helpers:** Supports colour-coded zones  
**When to use:** Classification tasks. Excellent for teaching categories, groups, and distinctions (vowels vs consonants, nouns vs verbs, odd vs even numbers).

---

### `dnd_sequence` — Arrange Items in Correct Order

**Description:** Items must be placed in the correct sequence — alphabetical, chronological, procedural, etc.

**Example:**
```
Prompt: "Arrange the following steps in the correct order"
Draggables: [Step 3, Step 1, Step 4, Step 2]
Drop zones: [Position 1, Position 2, Position 3, Position 4]
```

**Default maxPoints:** 5  
**Available for:** child, teen, adult  
**Generation:** Manual  
**Helpers:** Supports numbered zone labels  
**When to use:** Ordering tasks — life cycles, historical events, mathematical steps, reading sequences. Partial credit is possible (some positions correct).

---

### `dnd_match` — Match Pairs Across Two Columns

**Description:** Two columns of items; the learner drags from one column to match items in the other.

**Example:**
```
Prompt: "Match each word to its definition"
Left column: [ephemeral, verbose, tacit]
Right column: [understood without being stated, using more words than needed, lasting only a short time]
```

**Default maxPoints:** 5  
**Available for:** child, teen, adult  
**Generation:** Manual / AI  
**Helpers:** Supports connection lines visualisation  
**When to use:** Matching tasks. Excellent for vocabulary (word → definition), language (word → image), or mathematics (equation → answer). Efficient because multiple items are tested in one question.

---

### `dnd_fill` — Drag Words into Sentence Blanks

**Description:** A sentence with blank slots; the learner drags words from a word bank to fill the blanks.

**Example:**
```
Prompt: "Complete the sentence using the word bank"
Template: "The ___ beauty of morning mist is what makes it ___."
Draggables: [ephemeral, lasting, enchanting, permanent]
Drop zones: [Blank 1, Blank 2]
Correct: ephemeral → Blank 1, enchanting → Blank 2
```

**Default maxPoints:** 5  
**Available for:** child, teen, adult  
**Generation:** Manual / AI  
**Helpers:** Supports word definition tooltips on hover  
**When to use:** Contextual fill-in-the-blank with physical interaction. Great for sentence construction and reading comprehension. Requires `content.sentenceTemplate`.

---

### `dnd_build` — Drag Letters or Syllables to Build a Word

**Description:** The learner drags letters or syllables into the correct order to build a word. Primarily used in phonics and early reading.

**Example (IsiZulu phonics):**
```
Prompt: "Build the word: 'uma'"
Draggables: [ma, u, ba, i, lu]
Drop zones: [Syllable 1, Syllable 2]
Correct: u → Position 1, ma → Position 2
```

**Example (English spelling):**
```
Prompt: "Spell this word: ephemeral"
Draggables: [e, p, h, e, m, e, r, a, l, x, q]
Drop zones: [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

**Default maxPoints:** 5  
**Available for:** child, teen, adult  
**Generation:** Manual  
**Helpers:** Supports audio replay (hear the word again), letter hint  
**When to use:** Phonics and spelling. Most powerful for young children learning to decode words by sound and letter. Requires `content.sentenceTemplate` for the blank structure. Pairs naturally with `mcq_audio` — hear the word, then build it.

---

*Last updated: June 2026*
