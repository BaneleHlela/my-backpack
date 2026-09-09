# Dictionary buckets

September 2026 implementation. Replaces the one-bucket-per-profile/dictionary assumption.

## Data and behavior

- `TermBucket` now has a name, description, color, private/public visibility, `isFavorites`,
  `includeInQuiz`, optional `copiedFrom`, and a revision used to coordinate writes.
- Every profile gets one Favorites bucket for each active dictionary, at registration,
  guest/OAuth creation, profile creation/selection, and lazily on dictionary access.
  The partial unique index `one_favorites_per_dictionary` protects concurrent creation.
  Favorites keeps its name and cannot be deleted. It can be excluded from quizzes or made public.
- Existing bucket headers become private Favorites **in place**. Membership IDs, added dates,
  learning records, answer records and quiz history are retained.
- A membership is unique by `(bucketId, termId, definitionId)`. A meaning can be in several
  buckets. Learning remains unique by `(profileId, termId, definitionId)` and is kept when a
  membership or bucket is removed. Answers now update the exact definition and synchronize
  its mastery/relapse across memberships, preserving individually paused entries.
- Public discovery and detail endpoints return bucket metadata and meanings, never the author's
  profile identity or learning records. “Save a copy” creates a private, independently editable
  bucket using the recipient's existing learning or a fresh record. Later changes to the source,
  including making it private or deleting it, do not change copies.
- Deleting a profile removes its bucket headers, memberships and quiz source preferences.
  Profile vocabulary counts deduplicate definitions across buckets.
- Legacy `/vocab/bucket` reads/adds/removes still target Favorites. Term-detail saved flags
  consider all owned buckets. Legacy removal retains its term-level meaning; the new endpoints
  remove a single membership/definition.

## Quiz sources

`QuizBucketPreference` is unique by `(profileId, quizId, playModeId)`.

- `bucketIds: null` means use each bucket's current `includeInQuiz` default.
- An array means an explicit selection, even when a selected bucket is disabled by default.
- An empty array means no buckets; starting fails with actionable guidance.
- Omitting the override loads the preference for that quiz/mode. Web uses `classic`; mobile
  maintains a separate source preference for each of its eight modes.
- Deleted/unavailable custom choices cause a clear error instead of silently enabling defaults.
- Session creation verifies ownership and source dictionaries, ignores paused memberships,
  deduplicates exact meanings, applies the learning/mastered/all filter, then selects questions.
  A question from another definition of the same term cannot enter through a saved sibling meaning.
- Resolved bucket IDs are saved in `QuizSession.settings`. Editing buckets after a session starts
  does not change that session's selected questions.
- Empty selections, empty buckets, unmatched learning filters and unavailable question types are
  rejected **before** a session is persisted. Mobile and web no longer use the old broad
  `/quiz/has-content` call as a gate for these starts.
- Fixed and course pool quizzes retain their authored/pool question sources. Bucket preferences
  are offered only for dynamic quizzes.

## Interfaces

Mobile's dictionary buttons use bright violet and lime. `/miniapp/[miniAppId]/bucket` lists
buckets; a `bucketId` query parameter opens a detail screen and supports sharing. Web uses
its existing dictionary `/bucket` route with the same parameter. Both offer creation,
private/public editing, discovery, copies, per-bucket quiz defaults, word search, status filters,
server-side sorting and pagination. The definition card opens a multiple-selection bottom sheet
on mobile and a responsive dialog on web, with inline creation.

Bucket screens offer “Quiz this bucket”, word recommendations, pasted word lists and a link to
Merriam-Webster's vocabulary collections. Quiz settings offer bucket choices, reset to defaults,
creation and a route back to add words. New buckets start private and included by default.

## Recommendations and collections

One Anthropic request suggests 10 words by default (API maximum 20), with part of speech and a
short sense hint. The output ceiling is 700 tokens, request timeout 20 seconds, automatic retries
are disabled, and requests are limited to five per profile per hour. Input is bounded to the
short topic, level, age group, and at most 30 existing headwords. No full dictionary entries,
learning history or complete private bucket contents are sent. Only numeric usage is logged.

Suggestions are **not** dictionary definitions. The separate preview step returns cached real
Definition IDs. The learner explicitly selects meanings before saving. Unresolved words offer
individual dictionary lookup. The suggested word list is retained if preview fails, allowing
preview retries without another AI request. Bulk additions/copies generate basic template
questions with `allowAi: false`, so they do not make an AI request per word. Session selection
can recover unfinished preparation with up to 20 local template generations.

New Merriam-Webster definitions retain `sourceEntryId`, `sourceEntryUuid`, and
`sourceSenseKey: shortdef:<index>`. This identifies the saved short-definition summary within
that response; it is **not** a provider-stable full sense-sequence ID. Existing Definition IDs
are unchanged. Related headwords in a dictionary response are no longer stored as meanings of
the first word; cached terms are scoped to their dictionary.

Configuration:

- `ANTHROPIC_API_KEY`: existing server key. Without it, suggestions return a friendly unavailable
  message and users can still paste words and use ordinary dictionary search.
- `BUCKET_RECOMMENDATION_MODEL`: defaults to `claude-haiku-4-5-20251001`.
- `DICTIONARY_BULK_LOOKUP_ENABLED=false`: cached preview plus individual lookups is the default.
  Enable automated external preview lookups only after confirming provider permission for that use.
- `MERRIAM_WEBSTER_API_KEY`: existing dictionary key, required for uncached individual lookups.

There is no automatic website scraping or claimed Merriam-Webster collection API integration.
Users can browse [Merriam-Webster vocabulary collections](https://www.merriam-webster.com/vocabulary/see-all)
and paste a small list of headwords. Provider licensing is distinct from technical quotas;
consult the [dictionary API terms](https://dictionaryapi.com/info/terms-of-service) before enabling
bulk lookups or extending redistribution. These links informed the implementation; no live AI or
provider dictionary requests were made during verification.

## API

All routes below are under `/api/vocab/buckets` and require the active profile.

| Method/path | Purpose |
| --- | --- |
| GET /, POST / | List/create buckets for `miniAppId` |
| GET /discover | Public name search, 24 buckets per page |
| GET/PATCH/DELETE /:bucketId | Read/edit/delete bucket; detail has 40 meanings per page |
| POST /:bucketId/copy | Create private copy of a public bucket |
| POST /:bucketId/entries | Add 1–20 explicit Definition IDs |
| PATCH /:bucketId/entries/:entryId | Pause/resume one membership |
| DELETE /:bucketId/entries/:entryId | Remove one membership |
| GET/PUT /memberships | Read/set a meaning's exact owned bucket selection |
| GET/PUT /quiz-options | Read choices and save per-quiz/mode preference |
| POST /:bucketId/recommendations | Bounded AI headword suggestions |
| POST /:bucketId/preview | Review up to 20 dictionary headwords |

## Migration and deployment

Requires MongoDB transactions (Atlas/replica set). **Do not run the migration against production
as part of ordinary API startup.** The operational migration is separate from this PR.

1. Back up the database and record membership, learning and answer counts. Stop API writes,
   including older clients, while applying the migration.
2. Use this branch's installed API dependencies and the target `MONGODB_URI` in a controlled
   environment. Run the dry run:
   `pnpm --filter @my-backpack/api migrate:multiple-buckets`.
3. Review its reported legacy bucket and entry counts. Apply with
   `pnpm --filter @my-backpack/api migrate:multiple-buckets --apply`.
4. The script converts legacy headers, creates the Favorites partial unique index, backfills
   missing Favorites for profiles/dictionaries, drops only the old unique `(profileId,miniAppId)`
   index, and creates the remaining bucket indexes. It verifies entry counts and no remaining
   legacy headers. It can be rerun after interruption.
5. Deploy this API before the new clients, and resume writes. Smoke-test old Favorites words,
   a new bucket, quiz inclusion/overrides, public copy, and a second profile's access.

If verification fails, keep writes paused and inspect the backup. Before writes resume, restoring
the pre-migration database/code is a rollback option. After users create multiple buckets, do not
recreate the old unique index or roll back to code that assumes one bucket: use a forward fix,
or a separately reviewed export/restore plan that preserves the new data.

## Verification

- `pnpm --filter @my-backpack/api exec tsc --noEmit --ignoreDeprecations 6.0`
- `pnpm --filter @my-backpack/mobile exec tsc --noEmit --ignoreDeprecations 6.0`
- `pnpm --filter @my-backpack/web build`
- `node --test tests/*.test.cjs`
- `pnpm --filter @my-backpack/api test:bucket-unit`
- `pnpm --filter @my-backpack/api test:buckets`

The last command creates an isolated MongoDB 7.0 replica set and downloads its test binary on
first use. It needs no app database credentials. Tests cover migration preservation/idempotence,
concurrent Favorites creation, ownership/private access, independent copies, exact meanings,
quiz defaults/overrides/deduplication, empty-session prevention, paused/mastered states and provider
provenance. `.github/workflows/bucket-regressions.yml` runs these checks for the PR.

Local API/mobile TypeScript checks, the web build, 11 existing regression tests and 9 new
bucket service tests passed. The service tests use mocked database calls with real Mongoose
documents and cover source scoping, exact meanings, deduplication, empty selections, learning
synchronization and rejection of answers outside the selected session. Local MongoDB execution was blocked
by an `open: Operation not permitted` environment error; cloud Browser also blocked the local
preview address. Database results therefore depend on CI. Actual Android/iOS interaction,
keyboard/sheet behavior, public share links, and live provider responses still require device and
configured-environment smoke tests before release. The web build also needed removal of two
pre-existing unused declarations in `Scribbler.tsx`.
