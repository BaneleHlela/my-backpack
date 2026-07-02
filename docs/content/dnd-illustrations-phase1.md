# Claude Code Prompt — DnD Illustrations: Avatar Emotions, Drag-Area Backgrounds, English Vowel Assets

## Context

We're wiring real illustration assets into the English vowels `dnd_single` questions
(`apps/api/src/seed/questions/english/vowels.questions.ts`, 6 quiz variants per
`docs/content/vowels-dnd-quiz-design.md`). No sounds are being added in this pass —
leave all existing `audioUrl`/`dialogueAudioUrl` fields untouched.

This requires both schema additions and real frontend work — `dnd_single` has a
working renderer (`DndSinglePattern`), but per its own design doc it was built
"functionality over styling": draggables render as plain text (`item.imageUrl` is
never read), the drag area is a hardcoded `bg-amber-600` div, and there's no avatar
image anywhere — only `content.avatar.dialogue` as a text line. This prompt is what
turns those on, not just data plumbing.

---

## Phase 0 — Design doc (do this first)

Save a copy of this prompt to `docs/content/dnd-illustrations-phase1.md`.

---

## Phase 1 — Schema changes

Two files must stay in sync (per the existing comment in the API file):
`packages/shared/types/question.ts` and `apps/api/src/modules/question/question.types.ts`.

### 1. Extend the avatar emotion enum

```typescript
// before
emotion: 'happy' | 'thinking' | 'excited' | 'encouraging';
// after — add 'sad' and 'serious' for the miss-tutor avatar set; keep existing values
emotion: 'happy' | 'thinking' | 'excited' | 'encouraging' | 'sad' | 'serious';
```

`docs/design/avatar-guide.md` documents a `'celebrating'` emotion never actually
added to this enum. Out of scope here — add
`// TODO: celebrating documented but not implemented, see avatar-guide.md` rather
than silently including it.

### 2. Add `avatarEmotion` to `IFeedback`

```typescript
export interface IFeedback {
  text?: string;
  audioUrl?: string;
  highlightWords?: string[];
  avatarEmotion?: string; // which emotion content.avatar's character should show
                          // when this feedback fires (same avatarId, different expression)
}
```

### 3. Add `dragAreaImageUrl` to `IQuestionContent`

```typescript
  draggables?: IDraggable[];
  dropZones?: IDropZone[];
  dragAreaImageUrl?: string; // background covering the entire drag-and-drop widget
                             // (draggable tray + drop zone) — distinct from
                             // IDropZone.imageUrl, which only backgrounds one zone
```

---

## Phase 2 — `packages/shared/constants/assets.ts`

```typescript
export const ASSETS = {
  GCS_BASE: 'https://storage.googleapis.com/my-backpack-assets',
  // ...existing entries...
  DRAG_AREAS: {
    CLASSROOM_BOARD: 'https://storage.googleapis.com/my-backpack-assets/illustrations/drag-areas/26552.jpg',
  },
  ALPHABET: {
    // cartoon-grouped: uppercase+lowercase pair in one image (e.g. "Aa"), sourced from Vecteezy
    letterCard: (letter: string) =>
      `https://storage.googleapis.com/my-backpack-assets/draggables/alphabet/cartoon-grouped/letter-${letter}.png`,
  },
  AVATARS: {
    // generic — works for any avatarId, not just miss-tutor
    image: (avatarId: string, emotion: string) =>
      `https://storage.googleapis.com/my-backpack-assets/avatar/${avatarId}/${emotion}.png`,
  },
};
```

---

## Phase 3 — Update `apps/api/src/seed/questions/english/vowels.questions.ts`

This file already exists and has the exact shape below (confirmed from the current
repo, not assumed). Three edits, all inside the `QUIZ_VARIANTS` loop that builds
`dndContent`:

**1. Avatar** — currently:
```typescript
avatar: {
  avatarId: 'zoe',
  dialogue: `Drag the letter ${v.letter}!`,
  dialogueAudioUrl: `sounds/english/avatar/zoe-drag-${v.word}.mp3`,
  emotion: 'excited',
},
```
Change to:
```typescript
avatar: {
  avatarId: 'miss-tutor',
  dialogue: `Drag the letter ${v.letter}!`,          // unchanged
  dialogueAudioUrl: `sounds/english/avatar/zoe-drag-${v.word}.mp3`, // unchanged — no sounds this pass, and yes this still says "zoe" in the path, leave it
  emotion: 'smiling', // miss-tutor has no 'excited' asset (only happy/sad/serious/smiling) — smiling is the closest intro/neutral state
},
```

**2. Draggable images** — currently:
```typescript
const draggable: IDraggable = {
  id: `vowel-${dv.word}`,
  label: dv.letter,
  imageUrl: `content/english/vowels/card-${dv.word}.png`,
};
```
Change the `imageUrl` line to:
```typescript
  imageUrl: ASSETS.ALPHABET.letterCard(dv.word),
```
Add `import { ASSETS } from '@my-backpack/shared';` (check the exact existing import
style used elsewhere in this file for `@my-backpack/shared` — there may already be
one to extend rather than duplicate).

**3. Drag area background + feedback emotions** — add `dragAreaImageUrl` to
`dndContent` (alongside `draggables`/`dropZones`), and add `avatarEmotion` to the
**shared `tryAgainFeedback` const** (defined once near the top of the file, reused
across all variants/vowels — one edit covers everything) and to each variant's
`successFeedback`:
```typescript
const tryAgainFeedback = {
  text: 'Try again!',
  audioUrl: 'sounds/english/feedback/try-again.mp3',
  avatarEmotion: 'sad', // NEW
};

// inside dndContent:
dragAreaImageUrl: ASSETS.DRAG_AREAS.CLASSROOM_BOARD, // NEW
successFeedback: {
  text: v.successText,
  audioUrl: v.successAudioUrl,
  highlightWords: v.successText.split(' '),
  avatarEmotion: 'happy', // NEW
},
```

Do not touch `isizulu/vowels.questions.ts` — same structure, but out of scope for
this pass.

Re-run `pnpm --filter api seed` after and confirm question counts are unchanged
(idempotent upsert on `seedKey`, not new documents).

---

## Phase 3b — Wire the new fields into `DndSinglePattern`

This is the phase that actually makes any of the above visible. Read
`apps/web/src/components/quiz/patterns/DndSinglePattern.tsx` fully before editing —
below is what it currently does, confirmed from the repo, so you're extending it,
not guessing at its shape.

**1. Draggable images.** `DraggableItem` currently renders only `item.label` inside
a button. Add an `<img>` sourced from `resolveAssetUrl(item.imageUrl)` when present
(the helper already exists in this file and handles both relative and full-URL
paths — reuse it, don't duplicate it). Keep the label visible too rather than
replacing it — `showItemLabels` helper already governs label visibility elsewhere
in the codebase, so check whether that helper should gate this too. Fall back
gracefully when `imageUrl` is absent (math's `dnd_single` questions don't have one
yet) — text-only should keep working exactly as it does now.

**2. Drag area background.** The outer wrapper currently is:
```tsx
<div className="justify-between space-y-5 bg-amber-600 min-h-[70vh]">
```
`bg-amber-600` is the placeholder standing in for "styled as a classroom
board/bucket" per the design doc. When `content.dragAreaImageUrl` is present, use it
as a background image on this container (`backgroundImage`, `backgroundSize: cover`
via inline style, or Tailwind arbitrary value — match whatever convention
`DashboardPage.tsx` or other wallpaper-driven components in this codebase already
use for background images, per `asset-locations.md`'s asset-referencing pattern).
Fall back to the existing `bg-amber-600` when the field is absent, so unillustrated
DnD questions (math, etc.) don't regress to a blank background.

**3. Avatar emotion — read this carefully, the two states aren't symmetric.**

Per this component's own header comment, `retryUntilCorrect: true` (set on all 6
English vowels variants) means a wrong drop is checked locally against
`content.dropZones[].requiredDraggableIds` and **never calls `onAnswer`** — it's
handled entirely inside this component via the existing `wrongAttempt` state (which
already flashes the drop zone rose/red for 700ms and plays
`content.tryAgainFeedback?.audioUrl`). A correct drop **does** call `onAnswer`, which
means the server round-trip happens and the parent page's `AnswerFeedback` component
takes over from there.

So:
- **Sad (wrong attempt)** belongs *inside* `DndSinglePattern`, in the same branch
  that currently sets `wrongAttempt` and plays `tryAgainFeedback.audioUrl`. Add a
  small avatar image there using
  `ASSETS.AVATARS.image(content.avatar.avatarId, content.tryAgainFeedback?.avatarEmotion ?? content.avatar.emotion)`.
- **Happy (correct)** — check `AnswerFeedback.tsx` first (not shown to me, so I
  haven't assumed its shape). If it already renders anything avatar-related, extend
  that using `content.successFeedback?.avatarEmotion`. If it renders nothing
  avatar-related and adding it there is a larger change than this pass warrants,
  a reasonable fallback is a brief avatar swap inside `DndSinglePattern` itself
  right before `submit()` fires, mirroring the wrong-attempt pattern — but prefer
  `AnswerFeedback` if it's a clean fit, since that's the shared component every
  other question type already uses for this exact moment.

Keep this a static `<img src>` swap — not a new animation system. The avatar
character render is otherwise unbuilt (`content.avatar.dialogue` is plain text
today, per the design doc's "teacher avatar optional in v1, styled in a later
pass"), so this is the minimal version of that later pass, scoped to what's needed
here — don't build out Rive integration or a full avatar component library as a
side effect of this prompt.

If any of the above doesn't match what you find when you actually open the file,
stop and report rather than forcing it to fit.

---

## Phase 4 — Documentation updates (required, same PR)

### `docs/design/asset-locations.md`

Replace the `content/images/[subject]/` idea (discussed but never implemented) with
what's actually in use:

```
my-backpack-assets/
├── branding/
├── wallpapers/
├── ui/
│   └── illustrations/
│       └── bucket/            ← bucket/board UI illustrations (planned, not yet populated)
├── avatar/                     ← lesson avatar characters, one subfolder per avatarId
│   └── miss-tutor/
│       ├── happy.png
│       ├── sad.png
│       ├── serious.png
│       └── smiling.png
├── illustrations/
│   └── drag-areas/             ← full-width backgrounds for DnD widgets (e.g. classroom board)
├── draggables/                 ← reusable DnD asset library, organized by theme not subject
│   └── alphabet/
│       └── cartoon-grouped/    ← uppercase+lowercase pairs in one image, from Vecteezy
├── sounds/
│   └── isizulu/
└── content/
    └── vocab/
```

Note that draggable tile images are exempt from the 512×512 minimum that applies to
full illustrations — that rule targets hero/wallpaper-scale art, not small drag
chips.

### `docs/content/vowels-dnd-quiz-design.md`

This is the living design doc for exactly this content, and it currently has no
mention of illustrations at all — the "Question element mapping (no schema changes
needed)" table predates this pass. Add a short new section documenting
`dragAreaImageUrl` and `avatarEmotion`, and note that this table's "no schema
changes needed" framing no longer fully holds (two fields were added).

### `docs/technical/question-types.md` and/or `docs/content/dnd-activities.md`

Document `IFeedback.avatarEmotion` and `IQuestionContent.dragAreaImageUrl`. Note
that not every avatar has the full emotion set (miss-tutor has no `'excited'`) —
check available art before assigning an emotion to new avatar dialogue.

### `CLAUDE.md`

Add `avatarEmotion` and `dragAreaImageUrl` to the type reference comment block.
Update the GCS folder structure section to match the tree above.

---

## Notes for Claude Code

- Keep changes minimal and consistent with existing patterns — this codebase is not
  scaling yet.
- Do not touch `sounds/`-related fields anywhere in this pass.
- Do not modify `isizulu/vowels.questions.ts` — English only.
- If `vowels.questions.ts` or `DndSinglePattern.tsx` have changed since this prompt
  was written such that the code excerpts above no longer match, stop and report
  rather than forcing the diff.
- If any assumed asset path (avatar filenames/extensions, alphabet folder path)
  turns out wrong once checked against what's actually in GCS, flag it.

---

## Implementation deviations (recorded during execution)

Two points in this prompt didn't match the repo as found, resolved as follows:

1. **Emotion enum vs `'smiling'`.** Phase 1 said to add only `'sad'` and `'serious'`
   to the enum, but Phase 3's code sample assigns `emotion: 'smiling'` and describes
   miss-tutor's asset set as "happy/sad/serious/smiling". Asked the user; resolved
   by adding `'smiling'` to the enum as well, so the final enum is
   `'happy' | 'thinking' | 'excited' | 'encouraging' | 'sad' | 'serious' | 'smiling'`.

2. **`@my-backpack/shared` import in the seed file.** `apps/api/package.json` has no
   dependency on `@my-backpack/shared` (unlike `apps/web`), and there's no
   `node_modules/@my-backpack/shared` symlink for the API package — the API
   deliberately keeps a local mirror of the shared question types instead of
   importing them (per the existing "keep in sync" comment). Adding a new
   cross-package dependency wasn't asked for by the underlying task, so
   `vowels.questions.ts` uses literal relative GCS path strings (matching every
   other asset reference already in that file) instead of importing `ASSETS`.

3. **Real asset paths (follow-up correction from the user, same session).** The
   guessed `draggables/alphabet/cartoon-grouped/letter-{letter}.png` path was wrong
   — the real bucket has `draggables/` nested under `illustrations/`, i.e.
   `illustrations/draggables/alphabet/cartoon-grouped/letter-{letter}.png`. Fixed in
   both `ASSETS.ALPHABET.letterCard` and the seed file's literal string. The user
   also confirmed a real `illustrations/drop-zones/classroom-board.png` asset
   (sibling to `drag-areas/` and `draggables/`) and asked for it to back **every**
   `dnd_single` drop zone, not just English vowels. Implemented as a hardcoded
   default in `DndSinglePattern`'s `DropZoneArea` (`ASSETS.DROP_ZONES.CLASSROOM_BOARD`,
   `cover`-sized) rather than per-question seed data — a question's own
   `dropZone.imageUrl` still overrides it if ever set, but nothing sets it today, so
   the effect is universal across isiZulu vowels, English vowels, and math
   drag-intro. See `docs/content/vowels-dnd-quiz-design.md` §2a for detail.

4. **Avatar path (second follow-up correction).** Same issue as #3 — avatars are
   also under `illustrations/`, not top-level: `illustrations/avatars/{avatarId}/
   {emotion}.png` (plural `avatars/`, corrected again after an initial singular
   `avatar/` guess). Fixed in `ASSETS.AVATARS.image`. Also found and fixed a second
   bug this uncovered: `DndSinglePattern`'s wrong-attempt avatar was hand-building
   the path with a literal template string instead of calling
   `ASSETS.AVATARS.image()`, so it had the same missing-prefix bug independently of
   the constants file — now calls the shared helper like `AnswerFeedback.tsx`
   already did, so there's one source of truth for this path.
