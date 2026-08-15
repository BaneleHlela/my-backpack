// Dicebear avatar URL helper — ports apps/web's ProfileSwitcher.tsx's `avatarUrl()` convention
// (same DiceBear 8.x API, same style-by-ageGroup choice) with one deliberate difference: `png`
// output instead of `svg`. RN's <Image> can't render a remote SVG on its own — that needs
// react-native-svg's `SvgUri` fetching + parsing at runtime — while DiceBear's `png` endpoint
// (server-rendered) drops straight into a plain <Image source={{ uri }}>, matching this
// project's "keep it simple" convention.
import type { AgeGroup } from '@my-backpack/shared';

export function dicebearAvatarUrl(displayName: string, ageGroup: AgeGroup): string {
  const style = ageGroup === 'child' ? 'fun-emoji' : 'adventurer';
  return `https://api.dicebear.com/8.x/${style}/png?seed=${encodeURIComponent(displayName)}`;
}
