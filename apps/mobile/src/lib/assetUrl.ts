// Resolves a GCS-relative asset path (question audio, avatar images, feedback audio) to a
// full URL — mirrors apps/web's resolveAssetUrl() helper duplicated across its quiz pattern
// components. Question/feedback asset paths are relative (need ASSETS.GCS_BASE prefixing),
// unlike Lesson resource urls which are already stored as full URLs.
import { ASSETS } from '@my-backpack/shared';

export function resolveAssetUrl(path?: string): string | undefined {
  const value = path?.trim();
  if (!value) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^(https?:|file:|content:|data:|blob:)/i.test(value)) return value;
  return `${ASSETS.GCS_BASE}/${value.replace(/^\/+/, '')}`;
}
