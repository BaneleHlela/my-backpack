# Course Chat — Vision

**Status:** AI Helper is live (backend + web + mobile). Classmates & Teacher is a UI-only
placeholder — visibly present, disabled, "🔜 Coming soon" — with no backend, model, or
real-time infrastructure built for it yet.

## Scope for this pass

Course Chat is a new entry point on the Course screen (both web and mobile), sitting directly
above the MiniApps quick-links row. Tapping it opens a Course Chat hub with two destinations:

1. **AI Helper** — a 1:1 chat between the learner and an AI tutor, scoped to the specific course
   they're in. Built fully this pass: a new `AiChatMessage` model, a new `/api/ai-chat` module,
   an `aiChatHelper.service.ts` wrapping Claude Haiku (the same model already used for question
   generation), and chat UI on both web and mobile.
2. **Classmates & Teacher** — a shared, course-level chat with peers and the course's teacher.
   **Not built this pass.** The hub shows it as a visibly-present, disabled tile with a
   "🔜 Coming soon" badge and one explanatory line — no backend calls, no data model, nothing
   destructive happens if a learner taps it.

## The two-part vision, in full

The long-term idea is that Course Chat becomes the single place a learner goes to ask for help
inside a course — first from an AI, and eventually from real people (classmates working through
the same material, and the teacher who built it).

**AI Helper** stands on its own and doesn't depend on anything else being built. It's a
supportive, course-scoped study buddy — not a stand-in for a real teacher, and the system prompt
says so explicitly if a learner asks. It's age-aware (simpler language and tone for `child`
profiles, via the same `simplifiedLanguage` content-preference flag the rest of the app already
uses), and its conversation history persists indefinitely per profile+course, so a learner can
leave and pick the same thread back up later.

**Classmates & Teacher** is where this becomes a real product decision, not just an engineering
one. Building it for real means answering: who is "in" a course's chat? Right now, nothing in
this codebase answers that question. `ProfileSubjectEnrollment` tracks which subjects a learner
has enrolled in, but it's per-profile — there's no roster, no class, no group. And there's no
teacher account type at all: `Profile` has `isOwner`/`isPlatformAdmin` booleans, nothing like
`isTeacher` or `teacherId`. Both
[docs/content/teacher-guide.md](../content/teacher-guide.md) and
[docs/product/user-personas.md](user-personas.md) already mark teacher accounts as
`🔜 Coming in Phase 3` in [roadmap-vision.md](roadmap-vision.md).

Improvising around that gap — e.g. treating "everyone globally enrolled in this course" as a
group chat, or inventing an ad hoc `teacherId` field — would produce an unscoped, unmoderated
chat room, reachable by any learner who's ever added the course, including the platform's
youngest users. That's not a shortcut worth taking. Classmates & Teacher chat is explicitly
blocked on two things Phase 3 is meant to deliver:

- **Teacher accounts** — a real elevated-permission account type, not a boolean flag.
- **A class/cohort model** — something that actually groups a defined set of learners under a
  specific teacher for a specific course, which doesn't exist anywhere in the data model today.

Once both exist, Classmates & Teacher chat can be scoped to an actual class roster rather than a
guess.

## What happens when a learner taps Course Chat

1. From the Course screen, the learner taps the **Course Chat** button (above the MiniApps row).
2. The Course Chat hub opens, showing two cards: **AI Helper** (enabled) and
   **Classmates & Teacher** (muted, badged "🔜 Coming soon").
3. Tapping **AI Helper** opens a full-screen chat: a scrollable message history (loaded from
   `GET /api/ai-chat/course/:courseId/history`) and a text input at the bottom. Sending a message
   (`POST /api/ai-chat/course/:courseId/message`) shows the learner's bubble immediately, then a
   brief "AI Helper is typing…" state while Claude Haiku generates a reply anchored to that
   course and subject.
4. Tapping **Classmates & Teacher** does nothing destructive — the tile is disabled, and its
   explanation is already visible without needing to tap it at all.

## Guardrails already in place for AI Helper

- **Rate limiting**: a 5-second cooldown between messages, plus a 50-message/day cap per
  profile (across all their courses) — both derived directly from the `AiChatMessage` collection,
  no new infra. See the `AiChatMessage` entry in
  [docs/technical/data-models.md](../technical/data-models.md).
- **Persona**: a generic "AI Helper" — no named character, no avatar — explicitly honest about
  being an AI if asked, and instructed to redirect gently if asked something off-topic or
  inappropriate.
- **Cost containment**: only the last 20 messages of a thread are sent to Claude as context per
  turn, independent of how long the full persisted history grows.

---

*Last updated: August 2026.*
