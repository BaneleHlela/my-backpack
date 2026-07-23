// Asset router — mounted at /api/dashboard/assets. Platform-admin only.
import { Router, IRouter } from 'express';
import multer from 'multer';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import { uploadAssetHandler, listAssetsHandler } from './asset.controller';

const upload = multer({ storage: multer.memoryStorage() });

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// POST /api/dashboard/assets/upload — multipart form: file + type
router.post('/upload', upload.single('file'), uploadAssetHandler);

// GET /api/dashboard/assets?type=images&search=cat
router.get('/', listAssetsHandler);

export default router;
