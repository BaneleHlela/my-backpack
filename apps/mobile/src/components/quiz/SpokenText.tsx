// Text and its recording/TTS control use the same lifecycle and visible status.
import { StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { spacing, typography } from '@my-backpack/shared';
import { AudioButton } from '../AudioButton';
import { useTheme } from '../../theme/ThemeContext';

interface SpokenTextProps {
  text: string;
  lang: string;
  audioUrl?: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SpokenText({ text, lang, audioUrl, textStyle, containerStyle }: SpokenTextProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!text?.trim() && !audioUrl?.trim()) {
    return <Text style={textStyle}>{text}</Text>;
  }

  return (
    <View style={[styles.row, containerStyle]}>
      <Text style={[styles.text, textStyle]}>{text}</Text>
      <AudioButton compact url={audioUrl} text={text} language={lang} label="Read aloud" />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    text: {
      flex: 1,
      fontSize: typography.body,
      color: colors.text.primary,
    },
  });
}
