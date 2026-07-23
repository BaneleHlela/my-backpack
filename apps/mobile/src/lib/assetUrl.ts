// Resolves a GCS-relative asset path (question audio, avatar images, feedback audio) to a
// full URL — mirrors apps/web's resolveAssetUrl() helper duplicated across its quiz pattern
// components. Question/feedback asset paths are relative (need ASSETS.GCS_BASE prefixing),
// unlike Lesson resource urls which are already stored as full URLs.
import { ASSETS } from '@my-backpack/shared';

export function resolveAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${ASSETS.GCS_BASE}/${path}`;
}
