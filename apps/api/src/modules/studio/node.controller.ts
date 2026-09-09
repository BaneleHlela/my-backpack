// Route handlers for Content Studio RoadmapNode CRUD. Thin layer — logic lives in node.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync, AppError } from '../../utils/AppError';
import { resolveGradeSettings } from '../../utils/gradeSettings';
import {
  createNode,
  updateNode,
  reorderNodes,
  deleteNode,
  updateNodeItemGradeSettings,
  CreateNodeInput,
  UpdateNodeInput,
  UpdateNodeItemGradeSettingsInput,
} from './node.service';
import { createBookQuestionsForNode } from '../../services/bookIngestion/nodeBookQuestions';

export const createNodeHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    const input = req.body as CreateNodeInput;
    const node = await createNode(courseId, input);
    sendSuccess(res, node, 201);
  }
);

export const updateNodeHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params as { nodeId: string };
    const input = req.body as UpdateNodeInput;
    const node = await updateNode(nodeId, input);
    sendSuccess(res, node);
  }
);

export const reorderNodesHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    const { nodeIds } = req.body as { nodeIds: string[] };
    await reorderNodes(courseId, nodeIds);
    sendSuccess(res, { message: 'Nodes reordered' });
  }
);

export const deleteNodeHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params as { nodeId: string };
    await deleteNode(nodeId);
    sendSuccess(res, { message: 'Node deleted' });
  }
);

// PATCH /api/dashboard/nodes/:nodeId/items/:itemId/grade-settings — responds with the item's
// fully-resolved grade settings (never partial/undefined), not the whole node.
export const updateNodeItemGradeSettingsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId, itemId } = req.params as { nodeId: string; itemId: string };
    const input = req.body as UpdateNodeItemGradeSettingsInput;
    const node = await updateNodeItemGradeSettings(nodeId, itemId, input);
    const ref = node.items.find((i) => i.itemId.toString() === itemId);
    if (!ref) throw new AppError('Item not found on this node', 404);
    sendSuccess(res, resolveGradeSettings(ref.passingScore, ref.starThresholds));
  }
);

// POST /api/dashboard/nodes/:nodeId/book-questions — book-to-course pipeline, Phase 4a
// (official/curated). Body: { count? }. Generates AI questions from this node's chapter text,
// saves them as shared Question documents, and attaches a new mode:'fixed' Quiz to the node.
export const createNodeBookQuestionsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params as { nodeId: string };
    const { count } = req.body as { count?: number };
    const node = await createBookQuestionsForNode(nodeId, count);
    sendSuccess(res, node, 201);
  }
);
