// Round profile avatar — a DiceBear image (or the profile's own `avatarUrl` if set) layered
// over an initials circle. The initials sit underneath, always rendered, so they show through
// as a natural fallback while the image is loading or if it fails to fetch (offline, DiceBear
// down) — RN's <Image> paints nothing over the initials in either case, unlike a plain <img>
// on web which shows a broken-image icon.
import { Image, StyleSheet, Text, View } from 'react-native';
import type { AgeGroup } from '@my-backpack/shared';
import { dicebearAvatarUrl } from '../lib/avatar';
import { useTheme } from '../theme/ThemeContext';

interface AvatarProps {
  displayName: string;
  ageGroup: AgeGroup;
  avatarUrl?: string;
  size?: number;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ displayName, ageGroup, avatarUrl, size = 28 }: AvatarProps) {
  const { colors } = useTheme();
  const uri = avatarUrl ?? dicebearAvatarUrl(displayName, ageGroup);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary.DEFAULT,
          borderColor: colors.text.primary,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials(displayName)}</Text>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  text: {
    fontWeight: '700',
    color: '#fff',
  },
});
