# Where My Backpack Is Going

My Backpack is being built deliberately and incrementally. The foundation is a working adaptive learning engine, a solid account system, and two live mini-apps: an adult vocabulary app and a children's IsiZulu sounds roadmap. Everything is built on that foundation.

This document outlines the four phases of development — what is live now, what is next, and where the platform is ultimately headed.

---

## Phase 1 — Foundation (Current)

The first phase is about proving the core learning system works and building the infrastructure everything else will sit on.

**What's built and working:**

- **Account and profile system** — one account supports up to 6 profiles. Each profile has its own age group, content preferences, and learning data. Think Netflix-style switching with PIN-protected child profiles.
- **Content hierarchy** — a Field → Subject → Topic → MiniApp structure that can accommodate any subject at any level.
- **Adult vocabulary app (English)** — search for words, add them to your learning bucket, work through a quiz engine, and track your vocabulary growth over time.
- **Children's IsiZulu sounds roadmap** — a structured lesson path for learning the five IsiZulu vowel sounds, with audio prompts and drag-and-drop questions.
- **Adaptive learning engine** — tracks a confidence score per term per learner. Adjusts question selection based on what you know, what you're learning, and what you've mastered but might be forgetting.
- **Question generation system** — non-AI questions generated automatically for every vocabulary term. AI questions generated asynchronously using Anthropic Claude.
- **Quiz engine** — create sessions, answer questions, earn points, capture results. Supports 21 question types including multiple choice, typed input, drag-and-drop, audio, and fill-in-the-blank.
- **Admin tooling** — internal endpoints for generating questions, monitoring progress, and retrying failures.

---

## Phase 2 — The First Real Product (Near Future)

Phase 2 is about making the working backend visible to users. Everything in Phase 1 is a machine with no interface. Phase 2 builds the screen.

**Web frontend:**
- Vocabulary mini-app UI — search terms, view definitions, add to bucket, browse the dictionary
- Quiz UI — start a session, answer questions in all formats, see results and progress
- Roadmap UI — the Duolingo-style path: nodes on a map, locked and unlocked, stars for completion, rewards for finishing
- Children's DnD lesson player — a full-screen, touch-friendly experience for young learners working through audio and drag-and-drop activities

**More content:**
- More IsiZulu content — syllables, words, phrases, building on the vowel sounds foundation
- English content for young children — aligned to Grade R and Grade 1 vocabulary

**Mobile app (React Native):**
- Authentication and profile selection
- Vocabulary and quiz experience on mobile
- Roadmap UI on mobile — the primary home for children who use tablets

---

## Phase 3 — Teachers, Content Scale, and Rewards

Phase 3 transforms My Backpack from a consumer app into a platform.

**Teacher dashboard:**
- Teacher accounts with elevated permissions
- Roadmap builder — create nodes, add questions, link study material
- Question builder — write MCQ, DnD, and audio questions through a guided UI
- Class management — assign content to a class, monitor individual learner progress
- Content review workflow — AI drafts questions, teacher approves or edits

**AI-powered content from books:**
- Teachers upload PDF textbooks or lesson plans
- AI processes the content and generates study material, summaries, and questions
- Teacher reviews and approves before it goes live
- Dramatically reduces the time required to create quality content at scale

**CAPS curriculum coverage begins:**
- Structured roadmaps for Grade 1–12 Mathematics
- Structured roadmaps for Grade 1–12 English Home Language
- More IsiZulu content mapped to CAPS grade levels
- Curriculum tags on every node (CAPS, IEB, Cambridge) so content is filterable

**Rewards system live:**
- Peanuts wallet — earn, accumulate, track
- XP service — detailed learning activity tracking
- Reward catalogue — curated toys for children, vouchers for adults
- Online redemption portal for parents

---

## Phase 4 — Testing Centres and Scale

Phase 4 is where My Backpack becomes a full alternative to traditional exam-based education.

**Testing centre network:**
- Physical locations (starting in major South African cities) where learners write formal assessments
- Invigilated, standardised assessments linked directly to the roadmap content
- Results are official and recognised
- Peanut redemption in person — children collect their rewards, adults withdraw earnings

**Test readiness alerts:**
- The app calculates mastery across all topics in a subject
- When a learner crosses the readiness threshold, they receive an alert
- They book a testing centre slot directly from the app

**Parent dashboard:**
- Overview of all child profiles: progress, peanut balances, time spent learning
- Set reward goals per child
- Approve or restrict content categories
- Monitor weekly learning summaries

**University-level and professional content:**
- Engineering subjects (Statics, Thermodynamics, Fluid Mechanics)
- University Mathematics
- Professional certifications and skills

---

## Long-Term Vision

Every South African learner should have a My Backpack — a digital container that holds their entire educational journey, from their first IsiZulu vowel sound to their final university exam.

The vision is a system where:

- **Learning is self-paced** — no one is held back by a class, and no one is pushed forward before they're ready
- **Formal qualifications are earned by demonstrated mastery**, not by showing up on the right day
- **Teachers are rewarded** for creating quality content that other schools and learners benefit from — a content marketplace where great teaching earns income
- **Languages like IsiZulu are respected** as full academic languages, not afterthoughts
- **Children grow up expecting to learn at their own pace** — and never know anything different

My Backpack does not aim to replace schools. It aims to make what happens outside of school hours as powerful as what happens inside them — and to build the infrastructure for a future where formal qualifications can be earned by anyone, anywhere, at any pace.

---

*Last updated: June 2026*
