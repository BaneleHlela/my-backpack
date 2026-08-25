// One-off seed script: adds a hand-drafted "Conservation" topic (physics — conservation of
// momentum and energy) to an existing course, as one RoadmapNode + one 'notes' lesson + a
// 20-question mcq_general quiz. This content was drafted conversationally and hand-reviewed,
// not produced by any runtime AI call — no Anthropic SDK usage anywhere in this file, hence
// `source: 'manual'` on every inserted Question (see question.model.ts's QuestionSource).
//
// Idempotent only at the block level, not per-question: `Question` has no natural unique key
// to upsert against individually the way the project's other seeders do (compare
// isizulu/vowels.questions.ts, which upserts on `seedKey`). Node + lesson + questions + quiz
// are treated as one atomic unit — if a "conservation" node already exists with a quiz item on
// it, the whole thing is skipped.
//
// Usage: pnpm --filter api seed-conservation-topic -- --courseSlug=<slug>
import 'dotenv/config';
import { connectDB } from '../config/db';
import Course from '../models/core/course.model';
import RoadmapNode from '../models/learning/roadmapNode.model';
import Question from '../models/apps/language/vocabulary/question.model';
import Quiz, { IQuizSettings } from '../models/learning/quiz.model';
import { createNode } from '../modules/studio/node.service';
import { createLesson } from '../modules/studio/lesson.service';
import mongoose from 'mongoose';

interface ConservationQuestionSeed {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const QUESTIONS: ConservationQuestionSeed[] = [
  { "prompt": "In Aristotle's original view, what happens to an object once nothing is pushing on it anymore?", "options": ["It keeps moving at constant velocity forever", "It gradually returns to its \"natural\" state of rest", "It accelerates indefinitely", "Its momentum converts entirely into heat"], "correctAnswer": "It gradually returns to its \"natural\" state of rest", "explanation": "Aristotle treated rest as an object's natural state — motion required a continuous mover, and stopped once that influence was removed." },
  { "prompt": "Ibn Sīnā's (Avicenna's) refinement of \"impetus\" is a closer ancestor of the modern law of inertia than Philoponus's version. Why?", "options": ["He argued impetus fades away naturally over time", "He argued impetus stays exactly constant unless a force acts on it", "He proved impetus was identical to weight", "He rejected the idea of impetus entirely"], "correctAnswer": "He argued impetus stays exactly constant unless a force acts on it", "explanation": "Ibn Sīnā argued impetus only decreases because of forces like friction — in a vacuum, motion would continue at constant velocity forever." },
  { "prompt": "Jean Buridan's formula for impetus — weight times speed — turned out to be flawed. Why?", "options": ["Speed isn't a measurable quantity", "Weight depends on local gravity, so it isn't an intrinsic property of the object", "Momentum isn't actually conserved", "Impetus should point opposite to the motion"], "correctAnswer": "Weight depends on local gravity, so it isn't an intrinsic property of the object", "explanation": "Mass, not weight, is intrinsic — your weight changes on the Moon or in freefall, but your mass doesn't." },
  { "prompt": "Two cars each drive at 90 km/hour, one heading north and one heading south. Which is true?", "options": ["Same velocity, different speed", "Same speed, different velocity", "Same momentum", "Neither has a well-defined speed"], "correctAnswer": "Same speed, different velocity", "explanation": "Speed is the magnitude only; velocity is a vector, so direction matters." },
  { "prompt": "A 2 kg object moves at 3 m/s. What is the magnitude of its momentum?", "options": ["1.5 kg·m/s", "5 kg·m/s", "6 kg·m/s", "9 kg·m/s"], "correctAnswer": "6 kg·m/s", "explanation": "p = mv = 2 × 3 = 6 kg·m/s." },
  { "prompt": "What is the kinetic energy of a 4 kg object moving at 3 m/s?", "options": ["6 J", "12 J", "18 J", "36 J"], "correctAnswer": "18 J", "explanation": "E = ½mv² = ½ × 4 × 3² = ½ × 4 × 9 = 18 J." },
  { "prompt": "Using g ≈ 9.8 m/s², what is the potential energy of a 2 kg object held 5 meters up?", "options": ["9.8 J", "19.6 J", "49 J", "98 J"], "correctAnswer": "98 J", "explanation": "E = mgh = 2 × 9.8 × 5 = 98 J." },
  { "prompt": "Two lumps of clay collide and stick together. What's conserved, and what isn't?", "options": ["Neither momentum nor kinetic energy", "Momentum is conserved; kinetic energy is not", "Kinetic energy is conserved; momentum is not", "Both are conserved"], "correctAnswer": "Momentum is conserved; kinetic energy is not", "explanation": "This is what makes it inelastic — the \"lost\" kinetic energy becomes heat and deformation in the clay." },
  { "prompt": "By Noether's theorem, which symmetry of physical law is directly responsible for conservation of momentum?", "options": ["Symmetry under shifts in time", "Symmetry under shifts in space", "Symmetry under rotations", "Symmetry under reflections"], "correctAnswer": "Symmetry under shifts in space", "explanation": "Time-shift symmetry gives energy conservation; space-shift symmetry gives momentum conservation; rotational symmetry gives angular momentum." },
  { "prompt": "What does Laplace's Demon thought experiment illustrate about classical mechanics?", "options": ["The future is fundamentally random", "Given perfect knowledge of a system's state, its past and future are in principle fully determined", "Energy isn't actually conserved", "Momentum can appear from nothing"], "correctAnswer": "Given perfect knowledge of a system's state, its past and future are in principle fully determined", "explanation": "Classical mechanics is deterministic — the full state at one moment fixes every other moment, forward or backward, at least in principle." },
  { "prompt": "What does E = mc² actually tell us, in the context of this chapter?", "options": ["Energy and mass are unrelated", "Mass is a particular form of energy", "Momentum and energy are the same thing", "Only moving objects have energy"], "correctAnswer": "Mass is a particular form of energy", "explanation": "That's why \"conservation of mass\" isn't a separate law under relativity — mass is just one contribution to the total conserved energy." },
  { "prompt": "How do physicists define \"conservation,\" as used throughout this chapter?", "options": ["Using resources sparingly", "A quantity staying constant over time", "Objects returning to rest", "Energy transforming into other forms"], "correctAnswer": "A quantity staying constant over time", "explanation": "Conservation just means a quantity stays the same as time passes." },
  { "prompt": "What kind of explanation replaced Aristotle's teleological (\"goal-oriented\") picture of motion?", "options": ["Laws predicting the next moment from the current one", "A return to intrinsic natures, redefined", "A purely mathematical description with no physical meaning", "The idea that objects have no natural behavior at all"], "correctAnswer": "Laws predicting the next moment from the current one", "explanation": "Modern physics predicts the next moment from the current state, rather than explaining motion as objects pursuing a goal." },
  { "prompt": "When you push a coffee cup and it later comes to rest, what happens to the momentum you gave it?", "options": ["It disappears — conservation only holds in a vacuum", "It transfers to the chair, your body, and the Earth, whose vast combined mass makes the resulting speed change unmeasurably small", "It converts entirely to potential energy", "This is a genuine violation, which is why it's an idealization"], "correctAnswer": "It transfers to the chair, your body, and the Earth, whose vast combined mass makes the resulting speed change unmeasurably small", "explanation": "Momentum is conserved for the whole you/chair/Earth system, even though the cup alone appears to lose it." },
  { "prompt": "In the chapter's critique of the film Gravity, what could two drifting astronauts (no other forces acting) actually have done?", "options": ["Nothing — once drifting, they're doomed", "One could push off the other, sending one back toward the station while the other drifts away faster", "Reverse their momentum by waiting", "Rely on the station's gravity to pull them back"], "correctAnswer": "One could push off the other, sending one back toward the station while the other drifts away faster", "explanation": "Total momentum stays the same, so a push can send one person home even as it sends the other further away." },
  { "prompt": "In an elastic collision — two billiard balls bouncing apart on a frictionless table — what's conserved?", "options": ["Only momentum", "Only kinetic energy", "Both momentum and kinetic energy", "Neither"], "correctAnswer": "Both momentum and kinetic energy", "explanation": "Elastic collisions are defined by both quantities being conserved — that's what distinguishes them from inelastic ones." },
  { "prompt": "Émilie du Châtelet dropped heavy balls into soft clay to argue for what?", "options": ["Momentum and energy are the same quantity", "Energy is a conserved quantity distinct from momentum", "Mass is not conserved", "Impetus fades over time"], "correctAnswer": "Energy is a conserved quantity distinct from momentum", "explanation": "The clay displacement scaled with speed squared, matching kinetic energy rather than momentum — evidence energy is its own conserved quantity." },
  { "prompt": "What does the \"spherical-cow philosophy\" recommend when tackling a hard physics problem?", "options": ["Include every real-world complication from the start", "Idealize down to a simple version, solve it, then add complications back", "Avoid mathematics wherever possible", "Always assume friction dominates"], "correctAnswer": "Idealize down to a simple version, solve it, then add complications back", "explanation": "Solve the simplified version first, then reintroduce complications like friction or air resistance afterward." },
  { "prompt": "A 3 kg ball moving at 4 m/s collides head-on with an identical stationary 3 kg ball and they stick together. What's their combined velocity right after?", "options": ["1 m/s", "2 m/s", "4 m/s", "6 m/s"], "correctAnswer": "2 m/s", "explanation": "Total momentum before = 3 × 4 = 12 kg·m/s. Combined mass after = 6 kg. 12 ÷ 6 = 2 m/s." },
  { "prompt": "Which statement correctly distinguishes these terms as the chapter uses them?", "options": ["\"Classical\" and \"Newtonian\" mean exactly the same thing", "\"Newtonian\" is one specific model within the broader \"classical\" framework, which also covers relativistic mechanics", "\"Relativistic\" mechanics isn't classical at all", "\"Classical\" stands in contrast to Newtonian"], "correctAnswer": "\"Newtonian\" is one specific model within the broader \"classical\" framework, which also covers relativistic mechanics", "explanation": "Classical mechanics is the broad framework (deterministic, definite values); Newtonian is one model within it, alongside relativistic mechanics." }
];

// Mirrors studio/quiz.service.ts's DEFAULT_QUIZ_SETTINGS — not exported from that module (it's
// a local const there), so duplicated here rather than reaching into an internal.
const QUIZ_SETTINGS: IQuizSettings = {
  questionCount: 0,
  questionTypes: [],
  bucketFilter: 'all',
  feedbackMode: 'immediate',
  shuffleQuestions: false,
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const courseSlugArg = args.find((a) => a.startsWith('--courseSlug='));
  if (!courseSlugArg) {
    console.error('Usage: ts-node seedConservationTopic.ts --courseSlug=<slug>');
    process.exit(1);
  }
  const courseSlug = courseSlugArg.split('=')[1].toLowerCase();

  await connectDB();

  try {
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      console.log(`No course found with slug "${courseSlug}" — nothing to do.`);
      return;
    }

    // Block-level idempotency check — see the module comment above.
    const existingNode = await RoadmapNode.findOne({
      roadmapId: course.roadmapId,
      slug: 'conservation',
    });
    if (existingNode) {
      const hasQuizItem = existingNode.items.some((item) => item.itemType === 'quiz');
      if (hasQuizItem) {
        console.log('Conservation topic already seeded, skipping.');
        return;
      }
      console.error(
        `A "conservation" node already exists on this roadmap but has no quiz item — looks ` +
          `like a previous run of this script was interrupted partway through. Investigate ` +
          `manually before re-running (course "${course.name}", node ${existingNode._id}).`
      );
      process.exit(1);
    }

    console.log(`Course: "${course.name}" (${course._id})`);

    const node = await createNode(course._id.toString(), {
      title: 'Conservation',
      slug: 'conservation',
    });
    console.log(`Created node "${node.title}" (${node._id})`);

    const lesson = await createLesson(node._id.toString(), {
      title: 'Read Chapter One: Conservation',
      resources: [
        {
          type: 'notes',
          position: 1,
          markdown: 'Read Chapter One: Conservation',
        },
      ],
    });
    console.log(`Created lesson "${lesson.title}" (${lesson._id})`);

    const questionDocs = QUESTIONS.map((q) => ({
      miniAppId: course._id,
      nodeId: node._id,
      type: 'mcq_general' as const,
      content: {
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      },
      maxPoints: 5,
      pointsCanBePartial: false,
      source: 'manual' as const,
      isGeneric: true,
      profileId: null,
    }));

    const insertedQuestions = await Question.insertMany(questionDocs);
    console.log(`Inserted ${insertedQuestions.length} questions`);

    // Re-fetch — createLesson already pushed a 'lesson' item onto items[] server-side, but this
    // in-memory `node` doc doesn't reflect that push, so re-read before computing the quiz's
    // item position.
    const refreshedNode = await RoadmapNode.findById(node._id);
    if (!refreshedNode) throw new Error(`Node ${node._id} disappeared mid-script`);
    const quizPosition = refreshedNode.items.length + 1;

    const quiz = await Quiz.create({
      miniAppId: course._id,
      title: 'Conservation Quiz',
      mode: 'fixed',
      questionIds: insertedQuestions.map((q) => q._id),
      settings: { ...QUIZ_SETTINGS, questionCount: insertedQuestions.length },
      isUserAdjustable: false,
      isDefault: false,
    });

    await RoadmapNode.findByIdAndUpdate(node._id, {
      $push: { items: { itemType: 'quiz', itemId: quiz._id, position: quizPosition } },
    });
    console.log(`Created quiz "${quiz.title}" (${quiz._id}) with ${quiz.questionIds.length} questions`);

    console.log('Done. Summary:');
    console.log(`  Node: ${node._id}`);
    console.log(`  Lesson: ${lesson._id}`);
    console.log(`  Quiz: ${quiz._id}`);
    console.log(`  Questions: ${insertedQuestions.length}`);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
