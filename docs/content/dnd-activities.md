# Drag-and-Drop Activities — Design Guide

Drag-and-drop (DnD) activities are My Backpack's most interactive question format. They are especially powerful for young children who learn through physical interaction before they learn through reading. This guide covers all eight DnD activity types with examples across IsiZulu, English, and Mathematics content.

---

## Overview of DnD Activity Types

| Type | What the learner does |
|---|---|
| `dnd_single` | Drag one correct item to one zone |
| `dnd_select` | Choose the correct item from several and drag it to a zone |
| `dnd_count` | Drag an exact number of items to a zone |
| `dnd_sort` | Sort multiple items into multiple category zones |
| `dnd_sequence` | Place items in the correct order |
| `dnd_match` | Match pairs across two columns |
| `dnd_fill` | Drag words into blank spaces in a sentence |
| `dnd_build` | Drag letters or syllables to build a word |

---

## `dnd_single` — Drag One Item to One Zone

### What the child sees and does
One zone is highlighted on screen. Several items are available. The child drags the single correct item into the highlighted zone.

### IsiZulu example
```
Audio plays: "a"
Prompt: Drag the sound you heard
Draggables: [a] [e] [i] [o] [u]
Drop zone: [The sound you heard]
Correct: a → drop zone
```

### English example
```
Prompt: "Drag the word that means 'to run'"
Draggables: [run] [sit] [eat] [sleep]
Drop zone: [The correct word]
Correct: run → drop zone
```

### Mathematics example
```
Prompt: "Drag the correct number"
Draggables: [3] [5] [7] [9]
Drop zone: [How many apples? 🍎🍎🍎]
Correct: 3 → drop zone
```

### Helpers that make sense
- Audio replay button (especially for IsiZulu sound questions)
- Visual hint that briefly highlights the correct item

### Difficulty progression
- **Easy:** Distractors are very different from the correct answer (letter A vs letter Z)
- **Medium:** Distractors are similar (a, e, i, o, u — all vowels)
- **Hard:** Add more distractors, make the audio harder to distinguish

### Avatar dialogue examples
- Introduction: "Listen carefully! Can you find the right sound? 👂"
- Correct: "Yebo! That's the letter A! 🎉"
- Incorrect: "Oops! Listen again... 🎵"

---

## `dnd_select` — Drag the Correct Item from Multiple Options

### What the child sees and does
Multiple items are available, but only one is correct. The child identifies the right one and drags it to the zone.

### IsiZulu example
```
Prompt: "Drag the vowel"
Draggables: [a] [b] [m] [e] [n]
Drop zone: [A vowel]
Correct: a or e (either accepted)
```

### English example
```
Prompt: "Drag the word that means 'very happy'"
Draggables: [joyful] [angry] [tired] [hungry]
Drop zone: [Very happy]
Correct: joyful → drop zone
```

### Mathematics example
```
Prompt: "Drag the even number"
Draggables: [3] [4] [7] [9]
Drop zone: [An even number]
Correct: 4 → drop zone
```

### Helpers
- Definition tooltip on hover (hover a word to see its meaning)
- Hint that eliminates one wrong option

### Difficulty progression
- **Easy:** Only one option is remotely plausible
- **Medium:** Two options seem plausible; learner must distinguish between them
- **Hard:** All options are plausible; deep knowledge required

### Avatar dialogue examples
- Introduction: "Hmm, only one of these is right. Which one? 🤔"
- Correct: "Smart thinking! That's the one! ⭐"
- Incorrect: "Not quite — look carefully at each option!"

---

## `dnd_count` — Drag an Exact Quantity

### What the child sees and does
A pile of mixed items is shown. The child must drag exactly N items that meet the specified criterion into a zone.

### IsiZulu example
```
Prompt: "Drag the 3 vowels you can hear in this word: 'umuntu'"
Word displayed: u-m-u-n-t-u
Draggables: [u] [m] [u] [n] [t] [u]
Drop zone: [The vowels]
Correct: 3 × u → drop zone
```

### English example
```
Prompt: "Drag 4 words that are nouns"
Draggables: [dog, run, table, big, chair, jump, apple, fast]
Drop zone: [Nouns — drag exactly 4]
Correct: dog, table, chair, apple
```

### Mathematics example
```
Prompt: "Drag exactly 5 fruit into the basket 🧺"
Draggables: [🍎 🍊 🏀 🍌 🚗 🍇 📚 🍓]
Drop zone: [Basket]
Correct: any 5 fruit items
```

### Helpers
- Counter display showing how many items have been dragged vs how many are needed
- Visual confirmation (zone turns green when the count is correct)

### Difficulty progression
- **Easy:** Only the correct items are available; learner drags all of them
- **Medium:** Mix of correct and incorrect items; learner must identify and count
- **Hard:** Many distractors; the correct count is non-obvious

### Avatar dialogue examples
- Introduction: "Count carefully — I need exactly 5! 🧺"
- Correct: "Perfect counting! You got all 5! 🎊"
- Incorrect: "Hmm, check your count — is that right? 🤔"

---

## `dnd_sort` — Sort Items into Categories

### What the child sees and does
Multiple items are shown, along with two or more category zones. Each item must be dragged into the correct category.

### IsiZulu example
```
Prompt: "Sort the sounds: vowels go here, consonants go here"
Draggables: [a, b, e, m, i, n, o, l, u]
Drop zones: [Vowels] [Consonants]
Correct: a/e/i/o/u → Vowels; b/m/n/l → Consonants
```

### English example
```
Prompt: "Sort these words into nouns and verbs"
Draggables: [dog, run, table, jump, chair, eat]
Drop zones: [Nouns] [Verbs]
Correct: dog/table/chair → Nouns; run/jump/eat → Verbs
```

### Mathematics example
```
Prompt: "Sort into odd and even numbers"
Draggables: [1, 2, 3, 4, 5, 6, 7, 8]
Drop zones: [Odd numbers] [Even numbers]
```

### Helpers
- Colour-coded zones (blue for vowels, orange for consonants)
- Item preview showing which zone an item belongs to on hover

### Difficulty progression
- **Easy:** 2 categories, 4 items, clear distinction
- **Medium:** 2 categories, 8–10 items, less obvious distinction
- **Hard:** 3–4 categories, many items, nuanced classification

### Avatar dialogue examples
- Introduction: "Help me sort these — where does each one belong? 🗂️"
- Correct: "Perfect sorting! You knew exactly where each one goes! ✅"
- Partial: "Good start! A few are in the wrong place — can you fix them?"
- Incorrect: "Let's think about this together..."

---

## `dnd_sequence` — Put Items in Order

### What the child sees and does
Items are shown in a scrambled order. The child drags them into numbered zones to arrange them in the correct sequence.

### IsiZulu example
```
Prompt: "Put the vowels in alphabetical order"
Draggables: [o, a, u, e, i]
Drop zones: [1st] [2nd] [3rd] [4th] [5th]
Correct: a→1, e→2, i→3, o→4, u→5
```

### English example
```
Prompt: "Put these steps in order: how to make tea"
Draggables: [Add tea bag, Boil water, Pour water, Add milk, Drink]
Drop zones: [Step 1] [Step 2] [Step 3] [Step 4] [Step 5]
```

### Mathematics example
```
Prompt: "Arrange these numbers from smallest to largest"
Draggables: [15, 3, 42, 8, 27]
Drop zones: [1st] [2nd] [3rd] [4th] [5th]
Correct: 3→1, 8→2, 15→3, 27→4, 42→5
```

### Helpers
- Numbered zone labels (clear indication of position)
- Partial credit feedback (which positions are correct)

### Difficulty progression
- **Easy:** 3–4 items with obvious ordering
- **Medium:** 5–6 items, less obvious distinction
- **Hard:** 7+ items, close values, complex ordering rules

### Avatar dialogue examples
- Introduction: "Can you put these in the right order? First to last! 🔢"
- Correct: "Brilliant! You got the order exactly right! 🏆"
- Partial: "You're close! A few items are in the wrong spots."

---

## `dnd_match` — Match Pairs Across Two Columns

### What the child sees and does
Two columns of items are shown. The child drags an item from one column to its matching partner in the other column.

### IsiZulu example
```
Prompt: "Match each vowel to a word that starts with it"
Left: [a, e, i, o, u]
Right: [umuntu, indoda, ama, ekhaya, izwe]
Correct: a↔ama, e↔ekhaya, i↔indoda, o↔... (matched by starting sound)
```

### English example
```
Prompt: "Match each word to its definition"
Left: [ephemeral, verbose, tacit]
Right: [lasting only a short time, using more words than needed, understood without being stated]
```

### Mathematics example
```
Prompt: "Match each shape to its name"
Left: [🔺, ⬛, ⭕, 💠]
Right: [triangle, square, circle, diamond]
```

### Helpers
- Connection lines visualisation (a line appears between matched items)
- Colour coding by category

### Difficulty progression
- **Easy:** 2–3 pairs, very clear distinction
- **Medium:** 4–5 pairs, some similar-looking items
- **Hard:** 6+ pairs, subtle distinctions between matches

### Avatar dialogue examples
- Introduction: "Let's find the matches! Drag each one to its pair. 🔗"
- Correct: "Amazing! Every pair matched perfectly! 💫"
- Partial: "Almost there — check your matches again!"

---

## `dnd_fill` — Drag Words into Sentence Blanks

### What the child sees and does
A sentence with blank spaces is shown. A word bank of options is available. The child drags words from the bank into the correct blanks.

### IsiZulu example
```
Prompt: "Complete the sentence"
Template: "___ (name) ___."
Word bank: [Igama, lami, Siya, wena, yini]
Correct: Igama → blank 1, lami → blank 2, Siya → blank 3
```

### English example
```
Prompt: "Fill in the missing words"
Template: "The ___ beauty of cherry blossoms makes them ___."
Word bank: [ephemeral, permanent, precious, worthless]
Correct: ephemeral → blank 1, precious → blank 2
```

### Mathematics example
```
Prompt: "Complete the equation"
Template: "3 + ___ = 7, so ___ = 4"
Word bank: [4, 3, 7, 2, 10]
Correct: 4 → blank 1, 4 → blank 2
```

### Helpers
- Word definition tooltips (hover to see what each word means)
- Letter count display on each blank (how many letters the missing word has)

### Difficulty progression
- **Easy:** One blank, small word bank with obvious wrong options
- **Medium:** Two blanks, word bank includes plausible distractors
- **Hard:** Three or more blanks, word bank includes partial overlaps

### Avatar dialogue examples
- Introduction: "Drag the right word into each gap. 📝"
- Correct: "The sentence is complete and correct! ✨"
- Incorrect: "Hmm, try swapping some words around..."

---

## `dnd_build` — Drag Letters or Syllables to Build a Word

### What the child sees and does
Audio plays or a word is shown. The child drags letters or syllables into numbered zones to spell or construct the word.

### IsiZulu example (syllable building)
```
Audio plays: "uma"
Prompt: "Build the word you heard"
Draggables: [ma, u, ba, i, lu]
Drop zones: [Position 1] [Position 2]
Correct: u→1, ma→2
```

### English example (letter spelling)
```
Prompt: "Spell the word: cat"
Draggables: [c, a, t, d, p, r]
Drop zones: [Letter 1] [Letter 2] [Letter 3]
Correct: c→1, a→2, t→3
```

### Mathematics example (digit building)
```
Prompt: "Build the number thirty-two"
Draggables: [3, 2, 5, 0, 1]
Drop zones: [Tens] [Units]
Correct: 3→Tens, 2→Units
```

### Helpers
- Audio replay button (hear the word again before building it)
- First-letter hint (reveal the first position)
- Letter count display (how many positions need filling)

### Difficulty progression
- **Easy:** 2–3 letter word with many distractors obviously wrong
- **Medium:** 4–5 letter word with plausible letter distractors
- **Hard:** Longer words, all letter distractors are real letters in the word (just in the wrong order)

### Avatar dialogue examples
- Introduction: "Listen carefully and build the word! 🔤"
- Correct: "You spelled it! 🎶 That's [word]!"
- Incorrect: "Let's try again — listen one more time 🔊"

---

*Last updated: June 2026*
