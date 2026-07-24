// Interim live TTS (expo-speech) — ports apps/web's SpokenText.tsx behavior, not its
// library (react-text-to-speech wraps the browser Web Speech API; expo-speech is the RN
// equivalent). See docs/technical/mobile-architecture.md's "Live TTS (Prompt 3)" section —
// never used where a prerecorded audioUrl already exists; playback is manual (icon button),
// never autoplay. One accepted regression from web: no live word-by-word highlighting —
// expo-speech's documented API has no word-boundary callback to drive it.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import { useSpeak } from '../../lib/useSpeak';

interface SpokenTextProps {
  text: string;
  lang: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SpokenText({ text, lang, textStyle, containerStyle }: SpokenTextProps) {
  const { speak, stop, isSpeaking } = useSpeak(lang);

  if (!text?.trim()) {
    return <Text style={textStyle}>{text}</Text>;
  }

  return (
    <View style={[styles.row, containerStyle]}>
      <Text style={[styles.text, textStyle]}>{text}</Text>
      <Pressable
        onPress={() => (isSpeaking ? stop() : speak(text))}
        hitSlop={8}
        aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
        style={[styles.button, isSpeaking && styles.buttonActive]}
      >
        <Volume2 size={14} color={isSpeaking ? colors.primary.DEFAULT : colors.text.secondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  button: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.glassSoft,
    marginTop: 2,
  },
  buttonActive: {
    backgroundColor: colors.surface.glassStrong,
  },
});
