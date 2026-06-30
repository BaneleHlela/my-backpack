# Foundation Phase Roadmap & Question Design
### English · isiZulu Home Language · Foundation Phase Mathematics

*Planning document — for review before we write the Claude Code implementation prompt.*

---

## 0. Terminology, so we're using the same words

Your message uses "node" and "lesson" somewhat interchangeably. The schema is specific, so worth pinning down once:

| Your word | Schema term | What it actually is |
|---|---|---|
| "first one" / "next lesson" | **RoadmapNode** | One skill/milestone on the path (e.g. "Counting 1 to 10"). Has `position`, `curriculumTags`, `rewards`. This is what I'll call a **node** below. |
| (the 3 stops inside a node) | **Lesson** | `introduction` → `practice` → `assessment`, nested inside a node via `node.lessons[]` |
| "questions increasing in difficulty" | **Question** | Individual DnD/MCQ item, lives in `lesson.questionIds[]` |

One **Roadmap** per subject = the whole winding path. Nodes are beads on that one path, in order, via `roadmap.nodes[]`.

---

## 1. Current state — verified against the actual model and seed code, not just the docs

| Subject | Topic → MiniApp | Roadmap | Nodes |
|---|---|---|---|
| **isiZulu HL** | Sounds → Sounds Roadmap | "IsiZulu Sounds" | Node 1 **"Izinhlamvu Zokuvuma"** (Vowels) — fully built and live. 5 vowels × (mcq_audio + dnd_single) = 10 questions, all wired into the practice lesson. |
| **Foundation Phase Mathematics** | Number Sense → Counting Roadmap | "Counting 1 to 10" | Node 1 **"Counting 1 to 10"** — scaffolded (intro/practice/assessment lessons exist) but practice and assessment have **zero questions**. This is a shell waiting to be filled. |
| **English** | Vocabulary → Dictionary + Quiz | — | **Nothing.** The existing "English" subject/topic is the adult vocabulary app (search, dictionary, bucket). There is no Foundation Phase content, no roadmap, no Topic for it yet. |

This matters because it changes what "add node 1" means in each case:
- **isiZulu:** node 1 already exists and is live — your "drag the vowels" idea is already shipped. The new work is node 2 (consonants).
- **Math:** node 1 ("learning DnD" / apple-cabbage) doesn't exist yet, and what you're calling node 2 (counting) is a node that already exists in the DB but is empty inside.
- **English:** literally nothing exists. We're building the Topic, the MiniApp, and the Roadmap from scratch, then both nodes.

---

## 2. Decisions to lock in before the Claude Code prompt

### 2.1 🔴 Blocking: `Term.word` has a global unique index

`apps/api/src/models/apps/language/vocabulary/term.model.ts`:
```ts
word: { type: String, required: true, unique: true, trim: true, lowercase: true },
```

This is unique **across the whole collection**, not per mini-app. The isiZulu vowels seed already created Term documents for `a`, `e`, `i`, `o`, `u`. If English vowel questions are seeded the same way (`Term.findOneAndUpdate({ word: v.word }, { word: v.word, miniAppId: englishPhonicsMiniAppId, ... }, { upsert: true })`), it won't create new English terms — it will **find isiZulu's existing `a` term and silently reassign its `miniAppId` to English**, breaking any isiZulu query that filters terms by `miniAppId` (e.g. the alphabet-availability aggregation in the vocab service).

The same risk applies to CVC words like "cat" — if that word was ever searched and bucketed through the adult vocabulary dictionary, the same collision happens there too.

**Recommended fix:** change the index from a single-field unique constraint to a compound one:
```ts
word: { type: String, required: true, trim: true, lowercase: true }, // remove unique: true
...
termSchema.index({ miniAppId: 1, word: 1 }, { unique: true }); // make the existing index unique
```
This lets the same word exist once per mini-app, which is exactly what reusing `a`–`u` across isiZulu and English needs. This should be the **first thing** the Claude Code prompt does, before any new vowel seeding — otherwise the isiZulu data will quietly corrupt the moment English vowels are seeded.

### 2.2 English needs a new Topic + MiniApp + Roadmap

Mirrors what already exists for isiZulu Sounds. Two naming options for the Topic:

| Option | Reasoning |
|---|---|
| **"Phonics"** (recommended) | This is the actual CAPS English HL Foundation Phase strand name — your docs already say "South African first... aligns to CAPS." Using the real term means future content (blends, digraphs, sight words) has an obvious home. |
| "Sounds" | Mirrors isiZulu's topic name exactly, which has some appeal for consistency — but isiZulu's "Sounds" maps to its own CAPS strand (Listening and Speaking), and English's phonics strand is genuinely called Phonics in CAPS. I'd keep the names distinct and curriculum-accurate rather than force a match. |

I've gone with **Phonics** throughout this document — flag if you'd rather keep "Sounds."

Proposed: `Subject(english) → Topic("Phonics", slug: phonics) → MiniApp("Phonics Roadmap", slug: roadmap, type: roadmap) → Roadmap("English Phonics")`

### 2.3 The Math roadmap needs restructuring, not just appending

Adding "Let's Learn to Drag" as node 1 means the *existing* "Counting 1 to 10" node shifts from position 1 to position 2, and the roadmap's title stops being accurate (it'll contain more than counting). Concretely:

- Rename `Roadmap.title`: "Counting 1 to 10" → **"Number Sense Roadmap"** (matches the Topic name, stays accurate as more nodes get added later — patterns, more/less, etc.)
- New node "Let's Learn to Drag!" → `position: 1`
- Existing node "Counting 1 to 10" → `position` updated from `1` to `2`
- `Roadmap.nodes[]` reordered to `[{nodeId: dragNode, position:1}, {nodeId: countingNode, position:2}]`

This is a safe, idempotent change given the existing upsert pattern (the seed queries on `subjectId` alone, so updating `title` in place works fine) — but it does mean editing `math-foundation.roadmap.seed.ts` rather than only adding a new file.

### 2.4 isiZulu just needs node 2 added — nothing to undo

Node 1 stays exactly as it is. We add a second node to the *same* "IsiZulu Sounds" roadmap, at `position: 2`. No renaming needed — "IsiZulu Sounds" already reads fine as an umbrella title for vowels + consonants + (later) syllables.

### 2.5 Smaller open items — quick opinions, easy to override

- **Avatar:** only `zoe` exists in actual code right now (the docs describe a `[role]-[identifier]` convention like `tutor-1`/`guide-zulu`, but it's aspirational — nothing besides `zoe` has been implemented). I'd keep `zoe` as the one consistent guide across all three subjects for now rather than fragment the avatar roster before Phase 2 design work happens. Easy to change later since `avatarId` is just a string on each question.
- **Asset folders:** nothing exists yet for math or English. Proposed, mirroring the existing `sounds/isizulu/...` convention:
  - `content/math/objects/apple.png`, `content/math/objects/cabbage.png`, etc. (images)
  - `sounds/english/vowels/a.mp3`, `sounds/english/cvc/cat.mp3`, etc. (audio)
  - `content/english/cvc/card-cat.png` (letter/word cards)
- **autoReadPrompt for English/Math — recorded audio or browser TTS?** Nothing in the codebase points to a TTS service; everything built so far (isiZulu) uses pre-recorded native-speaker audio. For English, browser TTS (Web Speech API) is a realistic option and would save a lot of recording work — for Math prompts likewise. Worth deciding before asset production starts, but it doesn't change any of the question design below either way.
- **isiZulu node 2 title — "Izinhlamvu Zongwaqa":** I checked — *onkamisa* = vowels, *ongwaqa* = consonants is consistently confirmed across isiZulu linguistics sources, and it parallels your existing node 1 title "Izinhlamvu Zokuvuma" nicely. Same as your own docs recommend for all isiZulu strings though: worth a native-speaker confirmation pass before it ships, same as vowel audio gets.

---

## 3. Cross-cutting design notes

**Helper-fade philosophy.** Within a node, start with maximum scaffolding and remove it as questions progress — not because later questions are "harder content," but because the child has just demonstrated they can do the easy version:
- First 2–3 questions: `highlightCorrectZone: true`, `hintDelaySeconds: 5`, `autoReadPrompt: true`
- Middle questions: `highlightCorrectZone: false`, `hintDelaySeconds: 10` (the default)
- Final questions in a node: hints still available (never remove `hintsAllowed` entirely for foundation phase) but no auto-highlighting

**The DnD grading reality check.** `evaluateDnDAnswer` in `quizSession.service.ts` is **all-or-nothing per zone** right now — if any zone doesn't match exactly, `pointsAwarded: 0`, full stop. The docs describe "partial credit possible" for `dnd_sort` and `dnd_sequence`, but the current code doesn't implement that yet. None of the nodes below use `dnd_sort` or `dnd_sequence`, so it's not a blocker today — but it's worth knowing before a future "sort vowels vs consonants" or "put the numbers in order" node gets designed with 8+ items, because right now a child who gets 7/8 right scores exactly the same as a child who gets 0/8 right. Worth keeping early sort/sequence item counts to 3–4 until that's addressed.

**`dnd_count` only checks the correct items, not the absence of wrong ones.** The zone check is `validItems.length === requiredCount` — it filters for items that *are* in `requiredDraggableIds` and checks the count matches. It does **not** verify that no incorrect items also got dropped in the same zone. So a child could drag 5 correct apples *and* a stray car into the basket and still pass. Not worth engineering around for now, just worth knowing when designing the harder counting questions below (it's part of why I've kept the "mixed distractor pool" counting questions at the harder end, not the easy end).

---

## 4. Foundation Phase Mathematics

**Roadmap (renamed):** "Number Sense Roadmap" — `Subject: foundation-phase-mathematics → Topic: number-sense → MiniApp: roadmap`

### 4.1 Node 1 (NEW) — "Let's Learn to Drag!"

Pure mechanic introduction. No counting judgment yet — exactly your "1 apple, then a cabbage" idea. Single zone, single correct item, every question.

| Field | Value |
|---|---|
| `position` | 1 |
| `type` | `lesson` |
| `curriculumTags` | `[{ curriculum: 'CAPS', gradeLevel: 'r' }]` |
| `rewards` | `{ xp: 30, peanuts: 5 }` (lighter than content nodes — it's a warm-up) |

**Introduction lesson:** very short — one or two avatar-led lines, not a wall of text. This age group can't read yet; the avatar dialogue *is* the study material.

**Practice lesson** — 8 `dnd_single` questions, one object each, cycling through: apple, cabbage, carrot, banana, ball, car, cup, book. Helper-fade applied as described in §3.

Worked example (question 1, maximal scaffolding):
```
type: dnd_single
avatar: { avatarId: 'zoe', dialogue: "Let's play! Drag the apple here!", emotion: 'excited' }
draggables: [
  { id: 'apple-1', label: 'apple', imageUrl: 'content/math/objects/apple.png' },
  { id: 'car-1',   label: 'car',   imageUrl: 'content/math/objects/car.png' }   // max contrast distractor
]
dropZones: [
  { id: 'zone-main', label: 'Drag here', requiredDraggableIds: ['apple-1'], requiredCount: 1 }
]
successFeedback: { text: 'Yes! That\'s an apple! 🍎', highlightWords: ['Yes!'] }
tryAgainFeedback: { text: 'Try again — find the apple!' }
defaultHelpers: { highlightCorrectZone: true, hintDelaySeconds: 5, autoReadPrompt: true }
```
Question 2 (cabbage) repeats the pattern with a fresh object + distractor. By question 4–5, introduce a same-category distractor (banana vs. apple — both fruit) to add a small amount of real discrimination. By question 7–8, drop `highlightCorrectZone` to `false`.

**Assessment lesson:** 4–5 question subset (new object/distractor combinations, not verbatim reuse), `passingScore: 0.7`.

Deliberately kept single-zone throughout — multi-zone sorting is a natural seed for a *later* node, not this one.

### 4.2 Node 2 (EXISTS, currently empty) — "Counting 1 to 10"

This node already exists in the DB with the right structure; it just needs questions. Primary type: `dnd_count`, using the `quantity` field on `IDraggable` (a single draggable definition representing a "pile" you can repeatedly pull copies from) — this is exactly what "drag 5 apples to an area" needs.

| Field | Value |
|---|---|
| `position` | 2 (shifted from 1) |
| `curriculumTags` | `[{ curriculum: 'CAPS', gradeLevel: 'r' }]` (unchanged) |
| `rewards` | `{ xp: 50, peanuts: 10 }` (unchanged) |

**Practice lesson — 10 questions, counts 1 through 10, difficulty ramping by removing scaffolding rather than changing the skill being tested:**

| # | Target count | Pool composition | What's being tested |
|---|---|---|---|
| 1 | 1 | exactly 1 apple | trivial — drag the one thing |
| 2 | 2 | exactly 2 apples | drag everything, no judgment |
| 3 | 3 | exactly 3 apples | drag everything, no judgment |
| 4 | 4 | 6 apples (surplus) | first real "stop at the right number" |
| 5 | 5 | 8 apples (surplus) | your literal "drag 5 apples" example |
| 6 | 6 | 6 apples + 3 distractor objects | counting *and* classification together |
| 7 | 7 | 7 apples + 4 distractors | as above, bigger field |
| 8 | 8 | 10 apples + 5 distractors | as above |
| 9 | 9 | 9 apples + 6 distractors | as above |
| 10 | 10 | 10 apples + 8 distractors | hardest — full range, full field |

Worked example (question 5 — your exact scenario):
```
type: dnd_count
avatar: { avatarId: 'zoe', dialogue: "Count carefully — drag 5 apples into the basket!", emotion: 'thinking' }
draggables: [
  { id: 'apple', label: 'apple', imageUrl: 'content/math/objects/apple.png', quantity: 8 }
]
dropZones: [
  { id: 'basket', label: 'Basket', requiredDraggableIds: ['apple'], requiredCount: 5 }
]
defaultHelpers: { countingAudio: true, autoSubmit: true, hintsAllowed: 3 }
```
Question 9–10 (the hard end) add a second object pile, e.g. `{ id: 'banana', label: 'banana', quantity: 6 }`, so the pool genuinely mixes apple + banana + non-fruit distractors and the prompt becomes "drag 9 apples" — testing that the child isn't just dragging *everything in sight*.

**Helper note:** keep `countingAudio: true` across the whole node — it's reinforcing the number-word-to-quantity link, which is the actual numeracy skill, not training wheels to remove. What I'd fade instead is `autoSubmit` — turn it `false` for questions 6+ so the child has to deliberately hit Submit once they believe they've finished counting, which encourages a self-check rather than the system ending the question the instant the count happens to be right.

**Assessment lesson:** sample 5–6 counts across the range (e.g. 2, 4, 6, 8, 10), `passingScore: 0.7`.

### 4.3 Looking ahead (not designing in detail now)

CAPS Foundation Phase Maths has genuinely distinct content areas beyond Number Sense — Measurement (time, length), Space and Shape, Patterns, Data Handling. Rather than cramming "Time" into the Number Sense roadmap, I'd give it its own Topic when you get there:
```
Foundation Phase Mathematics → Measurement (new topic) → Measurement Roadmap (new miniapp) → Time node
```
Natural question types for time: `dnd_sequence` (order of a daily routine), `dnd_match` (clock face ↔ time-of-day label), `dnd_sort` (day activities vs. night activities) — worth remembering the binary-grading note from §3 when those get built.

---

## 5. English (Foundation Phase) — built from scratch

**New:** `Subject: english → Topic("Phonics", slug: phonics) → MiniApp("Phonics Roadmap", slug: roadmap, type: roadmap) → Roadmap("English Phonics")`

### 5.1 Node 1 (NEW) — "Vowel Sounds"

This directly mirrors the isiZulu vowels node — same two-question-type-per-sound pattern (`mcq_audio` for recognition + `dnd_single` for the drag mechanic), same Term/Definition backing so it plugs into the adaptive learning engine the same way. This *is* your "learning DnD" node for English — vowels do double duty as both the mechanic introduction and the first real content, same as isiZulu already does.

Short vowel sounds (the standard English phonics starting point):

| Letter | Sound | Example word |
|---|---|---|
| a | /æ/ | apple, cat |
| e | /ɛ/ | egg, bed |
| i | /ɪ/ | igloo, sit |
| o | /ɒ/ | octopus, dog |
| u | /ʌ/ | umbrella, cup |

| Field | Value |
|---|---|
| `position` | 1 |
| `curriculumTags` | `[{ curriculum: 'CAPS', gradeLevel: 'r' }, { curriculum: 'CAPS', gradeLevel: '1' }]` (mirrors isiZulu's dual-grade tagging) |
| `rewards` | `{ xp: 50, peanuts: 10 }` |

Worked example (letter 'a', the dnd_single half):
```
type: dnd_single
avatar: { avatarId: 'zoe', dialogue: "Drag the letter you heard!", emotion: 'excited' }
draggables: [
  { id: 'vowel-a', label: 'a', imageUrl: 'content/english/vowels/card-a.png', audioUrl: 'sounds/english/vowels/a.mp3' },
  { id: 'vowel-e', label: 'e', imageUrl: 'content/english/vowels/card-e.png', audioUrl: 'sounds/english/vowels/e.mp3' },
  { id: 'vowel-i', label: 'i', imageUrl: 'content/english/vowels/card-i.png', audioUrl: 'sounds/english/vowels/i.mp3' }
]
dropZones: [{ id: 'zone-main', requiredDraggableIds: ['vowel-a'], requiredCount: 1 }]
```
Plus the `mcq_audio` companion: `prompt: "audio:sounds/english/questions/pick-sound-a.mp3"`, `options: ['a','e','i','o','u']`, `correctAnswer: 'a'`, `explanation: 'The short vowel sound is "a" — like in apple!'`

Same two-question-per-vowel × 5 vowels = 10 practice questions, same structure as the isiZulu file. **This is the node that needs the Term.word fix from §2.1 before it can be seeded.**

### 5.2 Node 2 (NEW) — "Three-Letter Words"

Worth naming this correctly in code/docs: these are **CVC words** (Consonant-Vowel-Consonant) — the standard phonics term, and the docs' own `dnd_build` example ("Spell the word: cat") already shows this exact pattern.

| Field | Value |
|---|---|
| `position` | 2 |
| `curriculumTags` | `[{ curriculum: 'CAPS', gradeLevel: '1' }]` |
| `rewards` | `{ xp: 50, peanuts: 10 }` |

**Difficulty ramp across the practice lesson:**

| Tier | Words | Pool | What's tested |
|---|---|---|---|
| 1 (easiest) | cat, sit, sun | only the 3 correct letters, scrambled | pure ordering — no letter selection needed |
| 2 | mat, pin, dog, cup, hen | 3 correct letters + 1–2 distractor letters | selection *and* ordering |
| 3 (hardest) | minimal pairs: {cat, cap, can}, {pin, pit, pig}, {hot, hop, hog} | full letter set, words differ by one letter | genuine phonemic discrimination, not just shape-matching |

Worked example (tier 1, "cat"):
```
type: dnd_build
avatar: { avatarId: 'zoe', dialogue: "Listen, then build the word!", emotion: 'thinking' }
draggables: [
  { id: 'c', label: 'c' }, { id: 'a', label: 'a' }, { id: 't', label: 't' }
]
dropZones: [
  { id: 'pos-1', label: '1st letter', requiredDraggableIds: ['c'], requiredCount: 1 },
  { id: 'pos-2', label: '2nd letter', requiredDraggableIds: ['a'], requiredCount: 1 },
  { id: 'pos-3', label: '3rd letter', requiredDraggableIds: ['t'], requiredCount: 1 }
]
sentenceTemplate: "___ ___ ___"
blanks: [{ position: 0, correctDraggableId: 'c' }, { position: 1, correctDraggableId: 'a' }, { position: 2, correctDraggableId: 't' }]
defaultHelpers: { hintsAllowed: 3, hintDelaySeconds: 8 } // audio replay + first-letter hint per the docs guidance
```
Tier 2 adds 1–2 distractor letters to the same `draggables` pool (e.g. add `d`, `o` when building "mat"). Tier 3 keeps the full pool and leans on the avatar dialogue/audio to force genuine listening rather than shape recognition, since "cat" vs "cap" looks almost identical on the drag tray.

I'd pair each `dnd_build` with a quick `mcq_audio` recognition check first ("listen to the word, pick it from cat / cot / cut") before asking the child to *build* it — recognition before production is the easier skill, and it gives you 2 question-per-word instead of 1, which is consistent with how the vowels node does it.

### 5.3 Looking ahead

Natural next nodes once these two are solid: consonant blends (bl, st, sh), sight words, simple sentence building with `dnd_fill`. Not designing these now — flagging so the Topic/Roadmap naming above stays sensible as a long-term home for them.

---

## 6. isiZulu Home Language

### 6.1 Node 1 (EXISTS) — Izinhlamvu Zokuvuma (Vowels)

Already live — 5 vowels × (mcq_audio + dnd_single), avatar `zoe`, Term/Definition-backed. No changes needed. Including it here only so the full sequence (§7) reads top to bottom.

### 6.2 Node 2 (NEW) — Izinhlamvu Zongwaqa (Consonants)

Your consonant+vowel pairing idea (ba be bi bo bu / ca ce ci co cu) is exactly how isiZulu literacy is taught — each consonant drilled against all 5 vowels before moving to the next consonant. I've used your own two example consonants (**b**, **c**) as the starter set rather than substituting others, since that's literally what you specified — more consonants (m, n, l, and eventually the other clicks q, x) become their own follow-on nodes using the identical template.

**Hard rule worth encoding as a literal check/comment in the seed file, since you flagged it explicitly:** isiZulu has no /r/ phoneme as a native consonant — never generate `ra/re/ri/ro/ru` syllables. Worth a guard in the data array itself (e.g. a `excludeVowels` field per consonant, defaulting to empty, set to `['r']`-style exclusions only if a future consonant ever needs it) so this stays enforced as content scales past b/c.

| Field | Value |
|---|---|
| `position` | 2 |
| `curriculumTags` | `[{ curriculum: 'CAPS', gradeLevel: '1' }, { curriculum: 'CAPS', gradeLevel: '2' }]` (mirrors node 1's tagging) |
| `rewards` | `{ xp: 50, peanuts: 10 }` |

**Practice lesson** — for each consonant (b, c), drill all 5 vowel pairings with both question types = 2 consonants × 5 vowels × 2 types = **20 questions**.

Worked example (mcq_audio, "ba"):
```
prompt: "audio:sounds/isizulu/consonants/ba.mp3"
options: ['ba', 'be', 'bi', 'bo', 'bu']
correctAnswer: 'ba'
explanation: 'Umsindo ofanele ngu-"ba"'
```
Worked example (dnd_build, "ba"):
```
type: dnd_build
avatar: { avatarId: 'zoe', dialogue: 'Yakha umsindo owuzwile: "ba"!', emotion: 'excited' }
draggables: [
  { id: 'b', label: 'b' }, { id: 'a', label: 'a' },
  { id: 'm', label: 'm' }, { id: 'e', label: 'e' }   // distractor letters
]
dropZones: [
  { id: 'pos-1', requiredDraggableIds: ['b'], requiredCount: 1 },
  { id: 'pos-2', requiredDraggableIds: ['a'], requiredCount: 1 }
]
sentenceTemplate: "___ ___"
blanks: [{ position: 0, correctDraggableId: 'b' }, { position: 1, correctDraggableId: 'a' }]
```
Same pattern repeats for be/bi/bo/bu, then ca/ce/ci/co/cu.

**Assessment lesson:** sample across both consonants and a few vowel pairings each (e.g. ba, bo, ca, cu, be), `passingScore: 0.7`.

### 6.3 Looking ahead

Node 3 candidates: m, n, l (sonorant consonants, generally taught early and acoustically distinct from each other — easy to tell apart by ear, good for this age). Clicks (q, x — c is already in node 2) are acoustically more complex and worth their own dedicated node with extra audio-replay scaffolding rather than mixing them in with the first batch. Worth a native-speaker check on sequencing here too — I'm reasoning from general phonics-acquisition principles, not lived isiZulu pedagogy.

---

## 7. Full proposed sequence at a glance

| | Node 1 | Node 2 | Status |
|---|---|---|---|
| **Math** | Let's Learn to Drag! *(new)* | Counting 1 to 10 *(exists, empty → fill in)* | Roadmap needs renaming + restructuring |
| **English** | Vowel Sounds *(new)* | Three-Letter Words *(new)* | Topic/MiniApp/Roadmap all new |
| **isiZulu** | Izinhlamvu Zokuvuma *(exists, live)* | Izinhlamvu Zongwaqa *(new)* | Just append node 2 |

---

## 8. Suggested next steps

1. Confirm or adjust the decisions in §2 (especially 2.1 — the Term.word fix needs to happen first, or English vowel seeding will corrupt isiZulu data the moment it runs).
2. Confirm English topic naming ("Phonics" vs "Sounds").
3. Sign off on the object/word lists above (math objects, CVC words, the b/c consonant starter set) — easy to swap before we generate audio/image assets against them.
4. Once confirmed, I can help draft the actual Claude Code prompt — it'll need to: (a) fix the Term index, (b) create the English Topic/MiniApp/Roadmap, (c) restructure the math roadmap seed file, (d) write the four new questions seed files (math counting, math drag-intro, english vowels, english CVC, isizulu consonants) following the exact pattern of `vowels.questions.ts`.

*Last updated: June 2026*
