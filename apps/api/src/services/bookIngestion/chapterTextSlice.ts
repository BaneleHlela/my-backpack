// Rough per-node slice of a course's book text — proportional by the node's position among its
// roadmap's active nodes, not by parsed page numbers. Exact page-accurate slicing (matching a
// node's Lesson "Read pages X–Y" pointer) is a documented nice-to-have, not required for v1 —
// see docs/content/book-to-course-design.md. Used by both Phase 4 entry points: 4a
// (nodeBookQuestions.ts, a specific node) and 4b (aiChat.service.ts's practice-questions turn,
// the learner's current in-progress node).
import Roadmap from '../../models/learning/roadmap.model';

export async function sliceChapterText(
  extractedText: string,
  roadmapId: string,
  nodeId: string
): Promise<string> {
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap || roadmap.nodes.length === 0) return extractedText;

  const orderedNodeIds = roadmap.nodes
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((n) => n.nodeId.toString());

  const idx = orderedNodeIds.indexOf(nodeId);
  if (idx === -1) return extractedText;

  const total = orderedNodeIds.length;
  const chunkSize = Math.ceil(extractedText.length / total);
  const start = idx * chunkSize;
  const end = Math.min(extractedText.length, start + chunkSize);
  return extractedText.slice(start, end);
}
