# XP and points

XP is earned per learner profile from new quiz attempts. Peanuts remain inactive. There is
no balance to spend, leaderboard, level system, or retrospective award for old attempts.

## Earning rules

- One awarded mark is one base XP, including partial marks. Repeated practice earns base XP.
- A completed Classic/ordinary quiz with every question recorded and at least 10 answered or skipped questions can earn a performance bonus:
  75%–below 90%: 10%; 90%–below 100%: 20%; 100%: 25% of earned marks.
- Only the highest tier applies. Compare the exact earned/available ratio, not the rounded
  percentage displayed on results. Round the bonus once with Math.round.
- The first positive performance bonus per profile + quiz + UTC calendar day is awarded.
  Other attempts still receive all base XP. A zero-point rounded bonus does not consume the day.
- Timed, hearts, mastery, survival, streak, perfect and endless modes currently earn base only.
  Teacher-assigned modes on fixed quizzes are snapshotted server-side at session creation.
- Abandoned attempts retain recorded base marks without a bonus. An early complete request
  does not qualify for a bonus. Unanswered questions count toward available marks.
- A skip/timeout records zero marks. The earliest persisted answer for each session question
  is used when finalizing results, so historical/concurrent duplicate rows cannot inflate XP.

## Persistence and API

`QuizSession.xpContext` and `xpTitle` snapshot the owning context when an attempt starts.
Course content uses a Course ID in the legacy `miniAppId` field; `resolveXpContext` checks
Course before MiniApp and resolves the parent subject. A linked dictionary belongs to its
subject, not each course linking to it. Sessions predating this feature have no snapshot and
are excluded. Unresolvable/deleted content cannot opt into XP when creating a new session.

`XpAward` is an immutable earnings ledger. Its `_id` is the quiz session ID. A sparse unique
`bonusKey` index atomically claims the daily bonus in the same insert as its award. A duplicate
session insert reads the existing award; a daily-bonus collision retries with base XP only.
No transaction or denormalized profile counter is necessary. API startup creates the new
collection indexes before listening; the index creation must succeed.

Session completion/abandonment uses a conditional `active` update; a terminal attempt cannot
be converted into another terminal status. XP is calculated only from saved server results.
`results.xp` caches `{base, bonus, total, bonusRate, bonusReason}` for clients. Retrying a
completion repairs an interrupted cache write without awarding twice.

`GET /api/xp` requires `requireProfile`, uses the authenticated profile ID (no selectable
profile query), and returns overall, subject, course and mini-app totals plus ten recent
awards. It also repairs up to 50 finalized attempts missing their XP cache per request, covering
interruptions after final score persistence. Aggregations count each award once overall;
subject/course/mini-app lists are overlapping views of those same awards, not extra credits.

## Mobile display

`XpChip` replaces the XP placeholder in Menubar and appears in the quiz header. Home/general
screens show Total XP; subject/course/mini-app routes show their scope with a visible label.
A quiz uses the backend context snapshot. Tapping opens overall and current totals, scope
breakdowns, recent earnings, and the earning rules. Zero and unavailable/loading are distinct.

Totals refresh on screen focus, app foreground, and completed/abandoned attempts. Redux
request identity and profile checks discard stale responses after switching/signing out.
Confirmed increases pulse the chip, respecting reduced motion. Results show marks separately
from XP and explain bonus exclusions. Node completion no longer advertises unawarded fixed
XP or peanuts; the peanut chip is dimmed and labelled inactive for accessibility.

## Validation and rollout

Run `pnpm --filter @my-backpack/api test:xp-state` for scoring and mobile Redux/scope tests.
Run `pnpm --filter @my-backpack/api test:xp` for isolated MongoDB integration tests including
concurrent requests, daily limits, profile isolation, recovery, and finalization. This suite
starts its own disposable MongoDB process and never uses the application's database.
Both commands are included in the existing GitHub regression workflow.

Deploy the API before testing the new mobile build. No existing data migration is needed;
XP begins with attempts created by the new API. Old clients may still display placeholders
while the backend records XP. Device smoke check: complete a quiz, inspect results and scoped
XP, return home, open breakdown, retake, then switch profile. Check small screens, light/dark
theme, reduced motion and a temporarily unavailable API. No physical-device verification was
performed in the implementation workspace.
