import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { PaddedButton } from './PaddedButton';
import { spacing, typography } from '@my-backpack/shared';
import { getAccent } from '../theme/accentPalette';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

interface MiniAppGridCardProps {
  name: string;
  emoji: string;
  accentIndex: number;
  onPress: () => void;
}


export function MiniAppGridCard({
  name,
  emoji,
  accentIndex,
  onPress,
}: MiniAppGridCardProps) {
  const { colors } = useTheme();
  const accent = getAccent(colors, accentIndex);

  return (
    <PaddedButton
      width="45%"
      aspectRatio={3 / 4}
      color={accent.light}
      borderWidth={0}
      padding={0}
      borderRadius={'12%'}
      onPress={onPress}
      contentStyle={styles.content}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      <Text
        style={[
          styles.name,
          {
            color: colors.text.primary,
          },
        ]}
        numberOfLines={2}
      >
        {name}
      </Text>

      <Text
        style={[
          styles.description,
          {
            color: colors.text.secondary,
            fontWeight: 'bold'
          },
        ]}
        numberOfLines={2}
      >
        Improve your vocabulary.
      </Text>
    </PaddedButton>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  emoji: {
    fontSize: 60,
    lineHeight: 48,
    textAlign: 'center',
  },

  name: {
    fontFamily: fonts.display.semibold,
    fontSize: typography.heading,
    textAlign: 'center',
  },

  description: {
    fontFamily: fonts.display.regular,
    fontSize: typography.body,
    lineHeight: 16,
    textAlign: 'center',
  },
});