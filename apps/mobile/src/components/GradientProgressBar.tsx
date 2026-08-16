// A gradient-filled progress bar — replaces the flat-color fills previously used in
// CourseScreen.tsx and QuizProgress.tsx (design pass, August 2026: "gradient on sliders
// instead of plain colour"). `colors` defaults to the primary accent's light->DEFAULT->dark
// ramp so most callers need nothing beyond a `progress` value; callers rendering on top of an
// already-colorful surface (GradientListCard) pass a light, mostly-white ramp instead so the
// bar reads on any card accent.
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii } from '@my-backpack/shared';
import { useTheme } from '../theme/ThemeContext';

interface GradientProgressBarProps {
  progress: number; // 0-100
  colors?: [string, string, ...string[]];
  trackColor?: string;
  height?: number;
}

export function GradientProgressBar({ progress, colors, trackColor, height = 8 }: GradientProgressBarProps) {
  const { colors: theme } = useTheme();
  const pct = Math.max(0, Math.min(100, progress));
  const fillColors = colors ?? [theme.primary.light, theme.primary.DEFAULT, theme.primary.dark];

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radii.full, backgroundColor: trackColor ?? theme.surface.glassSoft },
      ]}
    >
      <LinearGradient
        colors={fillColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${pct}%`, borderRadius: radii.full }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
