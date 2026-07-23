// Route handlers for Content Studio RoadmapNode CRUD. Thin layer — logic lives in node.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  createNode,
  updateNode,
  reorderNodes,
  deleteNode,
  CreateNodeInput,
  UpdateNodeInput,
} from './node.service';

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
