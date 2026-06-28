# Teacher Guide — Creating Content on My Backpack

Welcome to My Backpack. This guide explains how teachers will be able to create roadmaps, lessons, and questions for their learners — aligned to the curriculum they teach. Whether you're a Grade 3 IsiZulu teacher in a township school or a university lecturer creating supplementary practice, My Backpack is designed to support you.

---

## 🔜 Teacher Dashboard — Coming in Phase 3

Teacher accounts and the teacher dashboard are coming in Phase 3 of My Backpack's development. The content creation tools described in this guide represent the intended workflow once the dashboard is available.

If you are a teacher reading this now and want to contribute content, please reach out — we are actively looking for teachers to collaborate with in the content design phase.

---

## What Teachers Will Be Able to Create

Once the teacher dashboard is live, teachers will be able to create:

**Roadmaps** — the learning path for a topic. A roadmap is a series of connected nodes (lessons, checkpoints, and practice activities) that learners work through in order. Think of it like a game map where each level must be completed before the next one unlocks.

**Nodes** — individual lessons within a roadmap. Each node has:
- A title and description
- Study material (written notes, audio, video, or book references)
- A set of questions for the assessment at the end
- A passing score requirement
- Rewards (peanuts and XP) for completion

**Questions** — the questions that appear in each node's assessment. My Backpack supports 21 question types including multiple choice, drag-and-drop, audio, and typed input. Teachers select the type, write the content, and the system handles the rest.

**Vocabulary terms** — words or concepts to be added to the dictionary and quiz mini-apps, complete with definitions, examples, and audio.

---

## How Content Maps to the Curriculum

Every node in a roadmap can be tagged with one or more curriculum references. This means the same node can appear in searches for multiple curricula without being duplicated.

**Example:** A node on "Vowel Sounds" in IsiZulu might be tagged:
- CAPS, Grade 3, Home Language
- CAPS, Grade 4, Home Language (for revision)

Tags are added when creating or editing a node. If your school follows IEB rather than CAPS, you tag your nodes as IEB — or apply both tags if the content is applicable to both.

The platform supports four curriculum frameworks:
- **CAPS** (Curriculum and Assessment Policy Statement) — standard South African public school curriculum
- **IEB** (Independent Examinations Board) — independent school curriculum
- **Cambridge** — international curriculum used by some private schools
- **University** — for higher education content
- **Other** — for content that doesn't fit a standard framework

---

## The Review and Approval Workflow

My Backpack uses a two-stage content creation workflow:

**Stage 1: Teacher creates content**
The teacher writes the roadmap structure, node descriptions, study material, and question prompts. For some question types (like multiple choice), the teacher provides the correct answer and the system — with AI assistance — proposes distractor options for review.

**Stage 2: Teacher reviews and approves**
Before any content goes live to learners, the teacher reviews the full question set. AI-generated distractors are shown for approval. The teacher edits, approves, or rejects each suggestion. Nothing goes live without teacher sign-off.

This workflow ensures that AI makes content creation faster without replacing the teacher's professional judgement.

---

## How Student Progress Is Tracked

Once a teacher assigns a roadmap to a class, the teacher dashboard shows:

- Which nodes each learner has completed
- Each learner's score on each node
- Which learners are struggling (low confidence scores, repeated attempts)
- Which learners are ready for the next level before the rest of the class
- Class-level summary: average completion rate, average score per node

This replaces the need to mark individual worksheets or quiz papers. The system collects and presents the data automatically as learners work through the content.

---

## Content Quality Guidelines

Good questions are the backbone of the learning experience. When writing content for My Backpack, keep these principles in mind:

**Be specific.** A question should test one clear thing, not multiple things at once. "What is a noun?" is a clear question. "What is a noun and how is it different from a verb?" is two questions.

**Use real examples.** Example sentences should be realistic — the kind of sentence a learner might actually read or write. Avoid artificial or overly academic examples, especially for younger learners.

**Make distractors plausible.** Wrong options in multiple choice questions should be wrong in a clear way, but not obviously silly. A learner who doesn't know the answer should be genuinely challenged, not guided by obviously absurd options.

**Anchor questions to the specific definition.** A word like "bank" has multiple meanings. If you're testing the financial meaning of "bank," every question about that definition should be unmistakably about money — not rivers. This prevents a correct-looking answer based on a different meaning of the same word.

**Match difficulty to age group.** Child profiles see simpler sentences with shorter words. Adult profiles can handle complex vocabulary in context. Write with your age group in mind.

---

## Audio and Image Requirements for DnD Activities

Drag-and-drop activities — especially for young children — often include audio and images. When creating DnD content, you will need to supply:

**Audio files:**
- Format: MP3
- Minimum quality: 128kbps
- Clear, isolated pronunciation — no background noise
- Naming convention: lowercase, hyphens, descriptive (e.g. `isizulu-vowel-a.mp3`)

**Images:**
- Format: PNG for illustrations, WebP for photographs
- Clear, unambiguous visuals — the image should represent exactly one thing
- Appropriate for the age group — no confusing or ambiguous content
- Minimum resolution: 512×512 pixels

Once uploaded to Google Cloud Storage, the system generates the asset URL automatically. You paste the path into the question content field.

---

## How to Write Good Avatar Dialogue for Children

Each question can include an avatar character that introduces the question and provides feedback. For children's content, avatar dialogue is one of the most important parts of the experience.

**Keep it short.** Children's avatar dialogue should be under 15 words per line. "Great job! You found the right vowel!" beats "Excellent work — your identification of the correct vowel was accurate!"

**Be warm and personal.** Where the learner's name is available (set on their profile), use it. "Well done, Siya!" is more engaging than "Well done!"

**Celebrate specifically.** "You found the letter A!" is better than "Correct!" The specificity reinforces what was learned.

**Be encouraging on failure.** "Oops, try again — listen carefully!" is better than "Wrong." The avatar should never feel discouraging.

**Use the learner's language.** If the content is IsiZulu, the avatar should speak in IsiZulu where possible. Code-switching is fine for young learners who are multilingual.

---

*Last updated: June 2026*
