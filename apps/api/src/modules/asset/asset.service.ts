// Uploads/lists question-media assets in GCS. No tracking collection — the
// bucket itself is the index (bucket.getFiles with a prefix).
import { ASSETS } from '@my-backpack/shared';
import { bucket } from '../../config/gcs';

export const ASSET_TYPES = ['images', 'audio', 'video', 'documents'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export function isAssetType(value: string): value is AssetType {
  return (ASSET_TYPES as readonly string[]).includes(value);
}

export interface IAssetSummary {
  name: string;
  path: string;
  url: string;
  size: number;
  updatedAt: string;
}

function sanitizeFilename(originalName: string): string {
  return originalName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function uploadAsset(
  file: Express.Multer.File,
  type: AssetType
): Promise<{ path: string; url: string }> {
  const path = `question-media/${type}/${Date.now()}-${sanitizeFilename(file.originalname)}`;

  await bucket.file(path).save(file.buffer, { contentType: file.mimetype });

  return { path, url: `${ASSETS.GCS_BASE}/${path}` };
}

export async function listAssets(
  type: AssetType,
  search?: string
): Promise<IAssetSummary[]> {
  const [files] = await bucket.getFiles({ prefix: `question-media/${type}/` });

  const assets = files.map((file) => ({
    name: file.name.split('/').pop() ?? file.name,
    path: file.name,
    url: `${ASSETS.GCS_BASE}/${file.name}`,
    size: Number(file.metadata.size ?? 0),
    updatedAt: file.metadata.updated ?? '',
  }));

  const filtered = search
    ? assets.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase()))
    : assets;

  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
