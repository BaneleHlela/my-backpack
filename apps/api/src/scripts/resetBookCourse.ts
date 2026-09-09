// One-off cleanup script for a course created via the book-to-course pipeline against the
// wrong book — hard-deletes its nodes/lessons/quizzes/questions/chat history/progress and
// unsets bookSource, leaving the Course itself (and its now-empty Roadmap) intact so it can be
// re-imported from the correct PDF. Real hard deletes (deleteMany/deleteOne), not the usual
// isActive: false soft-delete convention — deliberate, since this is test data from testing
// against the wrong book, not real content or learner history.
// Usage: pnpm --filter api reset-book-course -- --courseSlug=space-time-and-motion
import 'dotenv/config';
import { connectDB } from '../config/db';
import Course from '../models/core/course.model';
import Roadmap from '../models/learning/roadmap.model';
import RoadmapNode from '../models/learning/roadmapNode.model';
import Lesson from '../models/learning/lesson.model';
import Quiz from '../models/learning/quiz.model';
import Question from '../models/apps/language/vocabulary/question.model';
import AiChatMessage from '../models/learning/aiChatMessage.model';
import ProfileRoadmapProgress from '../models/learning/profileRoadmapProgress.model';
import mongoose from 'mongoose';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const courseSlugArg = args.find((a) => a.startsWith('--courseSlug='));
  if (!courseSlugArg) {
    console.error('Usage: ts-node resetBookCourse.ts --courseSlug=<slug>');
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

    const nodes = await RoadmapNode.find({ roadmapId: course.roadmapId });
    const nodeIds = nodes.map((n) => n._id);
    const quizItemIds = nodes.flatMap((n) =>
      n.items.filter((item) => item.itemType === 'quiz').map((item) => item.itemId)
    );

    const [lessonsCount, quizzesCount, questionsCount] = await Promise.all([
      Lesson.countDocuments({ nodeId: { $in: nodeIds } }),
      Quiz.countDocuments({ _id: { $in: quizItemIds }, miniAppId: course._id }),
      Question.countDocuments({ miniAppId: course._id }),
    ]);

    console.log(`Course: "${course.name}" (${course._id})`);
    console.log(`Current bookSource.pdfPath: ${course.bookSource?.pdfPath ?? '(none)'}`);
    console.log(
      `About to remove: ${nodes.length} node(s), ${lessonsCount} lesson(s), ` +
        `${quizzesCount} quiz(zes), ${questionsCount} question(s)`
    );

    let lessonsDeleted = 0;
    let quizzesDeleted = 0;
    let nodesDeleted = 0;

    for (const node of nodes) {
      const lessonResult = await Lesson.deleteMany({ nodeId: node._id });
      lessonsDeleted += lessonResult.deletedCount ?? 0;

      const nodeQuizItemIds = node.items
        .filter((item) => item.itemType === 'quiz')
        .map((item) => item.itemId);
      if (nodeQuizItemIds.length > 0) {
        const quizResult = await Quiz.deleteMany({
          _id: { $in: nodeQuizItemIds },
          miniAppId: course._id,
        });
        quizzesDeleted += quizResult.deletedCount ?? 0;
      }

      await RoadmapNode.deleteOne({ _id: node._id });
      nodesDeleted += 1;
    }

    const questionResult = await Question.deleteMany({ miniAppId: course._id });
    const aiChatResult = await AiChatMessage.deleteMany({ courseId: course._id });
    const progressResult = await ProfileRoadmapProgress.deleteMany({
      roadmapId: course.roadmapId,
    });

    await Roadmap.updateOne({ _id: course.roadmapId }, { $set: { nodes: [] } });
    await Course.updateOne({ _id: course._id }, { $unset: { bookSource: 1 } });

    console.log('Done. Removed:');
    console.log(`  Nodes: ${nodesDeleted}`);
    console.log(`  Lessons: ${lessonsDeleted}`);
    console.log(`  Quizzes: ${quizzesDeleted}`);
    console.log(`  Questions: ${questionResult.deletedCount ?? 0}`);
    console.log(`  AI chat messages: ${aiChatResult.deletedCount ?? 0}`);
    console.log(`  Profile roadmap progress docs: ${progressResult.deletedCount ?? 0}`);
    console.log('Roadmap.nodes reset to []; course.bookSource unset.');
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
