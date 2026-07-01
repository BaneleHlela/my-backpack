// Shared builder for the video-intro lesson used by both the IsiZulu Sounds and English
// Phonics vowels nodes, per docs/content/vowels-dnd-quiz-design.md. Only upserts the 1 intro
// Lesson (resources: video + notes) — the 6 dnd_single quiz variants are seeded and wired
// directly onto RoadmapNode.items[] by the vowels question-seed files
// (isizulu/vowels.questions.ts / english/vowels.questions.ts), which are the sole writer of
// node.items[] for these nodes. Idempotent — re-running updates existing records via
// findOneAndUpdate + upsert.
import { Types } from 'mongoose';
import Lesson from '../../../models/learning/lesson.model';

export interface VowelsLessonSequenceParams {
  nodeId: Types.ObjectId;
  roadmapId: Types.ObjectId;
  introTitle: string;
  introVideoUrl: string;
  introNotes: string;
}

export interface VowelsLessonSequenceResult {
  introLessonId: string;
}

export async function seedVowelsLessonSequence(
  params: VowelsLessonSequenceParams
): Promise<VowelsLessonSequenceResult> {
  const { nodeId, roadmapId, introTitle, introVideoUrl, introNotes } = params;

  const introLesson = await Lesson.findOneAndUpdate(
    { nodeId, position: 1 },
    {
      nodeId,
      roadmapId,
      position: 1,
      title: introTitle,
      resources: [
        { type: 'video', position: 1, url: introVideoUrl },
        { type: 'notes', position: 2, markdown: introNotes },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Superseded by direct quiz items on node.items[] (not extended) — delete the old
  // quiz-wrapper Lessons that used to occupy positions 2-7.
  await Lesson.deleteMany({ nodeId, position: { $gte: 2 } });

  return { introLessonId: introLesson._id.toString() };
}
