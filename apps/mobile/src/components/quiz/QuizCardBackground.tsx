import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface QuizCardBackgroundProps {
  accentColor: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  compact?: boolean;
}

// Shared by mode tiles and course quiz rows. The parent supplies colors.background and
// clips the decoration to its rounded corners. Tinting that surface keeps every accent
// readable with colors.text in both themes, including the always-light sky/pink tones.
export function QuizCardBackground({ accentColor, Icon, compact = false }: QuizCardBackgroundProps) {
  const { colors, theme } = useTheme();
  const dark = theme === 'dark';
  const ink = dark ? accentColor : colors.background;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, opacity: dark ? 0.28 : 0.26 }]} />
      <View style={[StyleSheet.absoluteFill, { opacity: dark ? 0.2 : 0.7 }]}>
        <View style={[styles.watermark, compact && styles.watermarkCompact]}>
          <Icon size={compact ? 108 : 144} color={ink} strokeWidth={1.2} />
        </View>
        <View style={[styles.sparkles, compact && styles.sparklesCompact]}>
          <Sparkles size={compact ? 22 : 32} color={ink} strokeWidth={1.4} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    right: -28,
    bottom: 8,
    transform: [{ rotate: '-16deg' }],
  },
  watermarkCompact: {
    right: 8,
    bottom: -32,
  },
  sparkles: {
    position: 'absolute',
    right: 26,
    top: 68,
    transform: [{ rotate: '12deg' }],
  },
  sparklesCompact: {
    right: 100,
    top: 8,
  },
});
