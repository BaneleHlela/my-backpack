# The Adaptive Learning Algorithm

My Backpack's adaptive learning engine is the core of the product. It answers one question continuously: *How well does this learner know this thing right now?* Everything else — which question comes next, when to review, when to declare mastery — flows from the answer to that question.

This document describes the algorithm in full, from the confidence score to spaced repetition to learning velocity.

---

## 1. The Confidence Score

Every learner has a confidence score for every term they are studying. It is a number between **0.0 and 1.0**, where:

- **0.0** — completely unknown, never seen or consistently wrong
- **0.5** — in progress, some correct answers, some wrong
- **0.85** — mastery threshold (default) — the learner consistently gets this right
- **1.0** — theoretical maximum, approached but rarely reached in practice

The score is stored on the `LearningRecord` model as `confidenceScore`. It changes every time the learner answers a question about that term.

The score is not displayed to learners directly. Instead, it powers the question selection logic, the spaced repetition scheduler, and the mastery declaration — all invisible machinery that the learner experiences as the app "knowing" what they need to see next.

---

## 2. How the Confidence Score Changes

### In plain English

When you answer correctly, your confidence score rises. How much it rises depends on how many points you earned relative to the maximum, and how fast you normally learn.

When you answer incorrectly, your confidence score drops by a fixed amount regardless of how partial the score was. Being wrong is being wrong.

### The formulae

**Correct answer (points awarded > 0):**
```
confidenceChange = +0.15 × (pointsAwarded / maxPoints) × learningVelocity
```

**Wrong answer (points awarded = 0):**
```
confidenceChange = -0.20
```

**Applied as:**
```
newScore = clamp(oldScore + confidenceChange, 0.0, 1.0)
```

The score never goes below 0.0 or above 1.0.

### Example

A learner with velocity 1.0 answers an `mcq_term_to_def` question (maxPoints: 4) and scores 4/4:

```
confidenceChange = +0.15 × (4/4) × 1.0 = +0.15
```

The same learner scores 2/4 (partial credit):

```
confidenceChange = +0.15 × (2/4) × 1.0 = +0.075
```

The learner gets it completely wrong:

```
confidenceChange = -0.20
```

The wrong-answer penalty is deliberately steeper than the correct-answer gain. A single wrong answer undoes more than one correct answer can build. This reflects the reality that errors are more informative about gaps than correct answers are about mastery.

---

## 3. Learning Velocity

### What it is

Learning velocity measures how fast this particular learner masters new terms compared to the average learner on the platform.

A velocity of **1.0** means you learn at the platform average pace.  
A velocity of **2.0** means you learn twice as fast — your correct-answer boost is doubled.  
A velocity of **0.5** means you learn more slowly — your correct-answer boost is halved.

### Why it exists

Two learners who both answer correctly should not receive identical confidence boosts if one consistently masters terms in 3 questions and the other takes 12. The faster learner's correct answer is stronger evidence of mastery.

### The formula

```
PLATFORM_AVG_QUESTIONS_TO_MASTER = 5 (hardcoded constant)

learningVelocity = PLATFORM_AVG_QUESTIONS_TO_MASTER / userAverage
```

Where `userAverage` is the learner's `avgQuestionsToMaster` from their `AdaptiveProfile.miniAppStats`.

**Clamped between 0.5 and 2.0.** No learner gets more than 2× the standard boost, and no learner gets less than half.

### Example

A learner who typically masters terms in 3 questions:
```
velocity = 5 / 3 = 1.67 (clamped to 1.67)
```

A learner who typically needs 10 questions:
```
velocity = 5 / 10 = 0.5 (at the minimum clamp)
```

### When it's recalculated

Learning velocity is recalculated every 10 mastered terms per mini-app. This gives enough data to be meaningful before updating the learner's profile.

---

## 4. The Mastery Threshold

When a learner's confidence score for a term reaches **0.85** (the default `masteryThreshold`), the term is declared **mastered**.

On mastery:
- `LearningRecord.status` changes from `learning` to `mastered`
- `LearningRecord.masteredAt` is set
- `LearningRecord.nextReviewAt` is set to **1 day from now**
- The term enters the spaced repetition review cycle
- `questionsToFirstMastery` is recorded for velocity calculations

The mastery threshold is stored on `AdaptiveProfile.masteryThreshold` and can theoretically be adjusted per learner, though the default is 0.85 for all learners.

---

## 5. Spaced Repetition

### Why it exists

When a term is mastered, the work isn't over — it must be maintained. Without periodic review, even well-learned information fades. Spaced repetition is the practice of reviewing information at increasing intervals, where each successful review pushes the next review further into the future.

### The review intervals

| Review count | Days until next review |
|---|---|
| 0 (just mastered) | +1 day |
| 1 | +3 days |
| 2 | +7 days |
| 3 | +14 days |
| 4+ | +30 days |

So a term mastered today is reviewed tomorrow. If the learner gets it right, it's reviewed again in 3 days. Right again — 7 days. And so on, up to a maximum interval of 30 days for well-retained terms.

Each successful review increments `LearningRecord.reviewCount` and sets a new `nextReviewAt`.

### What happens if the learner gets a review question wrong

If the learner fails a review question (answer is wrong), the confidence score drops by 0.20. If it drops below the mastery threshold (0.85), the term re-enters `learning` status and the learner must rebuild confidence before the next review is scheduled.

---

## 6. Question Selection Priority

When a quiz session is created, questions are selected in a specific priority order:

**Priority 1: Terms due for review**
LearningRecords where `status === 'mastered'` and `nextReviewAt <= now`. These are shown first because missing a review window causes forgetting.

**Priority 2: Active learning terms**
LearningRecords where `status === 'learning'`, sorted by `confidenceScore` ascending. The lowest-confidence terms are presented first — the learner gets the most help where they need it most.

**Priority 3: Unseen terms**
BucketEntries where no LearningRecord exists yet (never answered). New material is introduced last, after existing material has been reinforced.

This priority order ensures that a learner who returns after a few days sees their due reviews before encountering new material.

---

## 7. The AdaptiveProfile

One `AdaptiveProfile` document exists per learner. It accumulates aggregate statistics used by the algorithm:

```typescript
{
  profileId: ObjectId,
  miniAppStats: Map<miniAppId, {
    avgQuestionsToMaster: number,    // used for velocity
    totalTermsMastered: number,
    totalTermsAttempted: number,
    learningVelocity: number         // cached, updated every 10 terms
  }>,
  globalStats: {
    avgQuestionsToMaster: number,
    totalCorrectAnswers: number,
    totalAnswers: number,
    overallAccuracy: number,
    currentStreak: number,
    longestStreak: number,
    lastStudiedAt: Date
  },
  masteryThreshold: number           // default: 0.85
}
```

---

## 8. How the System Gets Smarter Over Time Per Learner

At the start, every learner has no `AdaptiveProfile` stats. The system defaults to a velocity of 1.0 (platform average) until enough data is collected.

After 10 terms are mastered in a mini-app, the learner's personal velocity is calculated for the first time. From that point on, each question response adjusts the confidence score using a velocity that reflects how *this specific learner* learns.

The result is that a fast learner's scores build quickly to mastery, while a slower learner's scores build more gradually — but both learners are on a path matched to their own pace. Neither is artificially held back, and neither is artificially accelerated.

---

*Last updated: June 2026*
