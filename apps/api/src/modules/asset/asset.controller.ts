// HTTP handlers for asset routes. Thin layer — all logic lives in asset.service.ts.
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { uploadAsset, listAssets, isAssetType } from './asset.service';

export async function uploadAssetHandler(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.body as { type?: string };
    if (!type || !isAssetType(type)) {
      sendError(res, "type must be one of 'images', 'audio', 'video', 'documents'", 400);
      return;
    }
    if (!req.file) {
      sendError(res, 'file is required', 400);
      return;
    }

    const result = await uploadAsset(req.file, type);
    sendSuccess(res, result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload asset';
    sendError(res, message, 500);
  }
}

export async function listAssetsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { type, search } = req.query as { type?: string; search?: string };
    if (!type || !isAssetType(type)) {
      sendError(res, "type must be one of 'images', 'audio', 'video', 'documents'", 400);
      return;
    }

    const result = await listAssets(type, search);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list assets';
    sendError(res, message, 500);
  }
}
