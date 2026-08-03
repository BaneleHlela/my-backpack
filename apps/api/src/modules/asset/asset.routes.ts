// Asset router — mounted at /api/dashboard/assets. Platform-admin only.
import { Router, IRouter, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import { uploadAssetHandler, listAssetsHandler } from './asset.controller';
import { sendError } from '../../utils/response';

// Single blanket cap across all four asset types (images/audio/video/documents) for simplicity —
// generous enough for a several-minute Foundation Phase clip at reasonable compression, while
// bounding what memoryStorage() holds in server RAM per upload. Adjust here if a tighter
// per-type cap is ever needed (that would move to asset.controller.ts instead).
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } });

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// multer calls next(err) (rather than throwing into uploadAssetHandler) when the file exceeds
// the size limit — this error-handling middleware (4 args, placed right after upload.single)
// is what Express routes that to, so it surfaces as a normal 400 via sendError() instead of
// falling through to the global error handler as an unhandled 500.
function handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large — max ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB`
        : err.message;
    sendError(res, message, 400);
    return;
  }
  next(err);
}

// POST /api/dashboard/assets/upload — multipart form: file + type
router.post('/upload', upload.single('file'), handleUploadError, uploadAssetHandler);

// GET /api/dashboard/assets?type=images&search=cat
router.get('/', listAssetsHandler);

export default router;
