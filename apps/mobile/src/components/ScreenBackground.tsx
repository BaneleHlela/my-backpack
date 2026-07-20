import { ImageBackground, StyleSheet, type ViewProps } from 'react-native';
import { ASSETS, colors } from '@my-backpack/shared';

export function ScreenBackground({ style, children, ...rest }: ViewProps) {
  return (
    <ImageBackground
      source={{ uri: ASSETS.wallpapers.portrait }}
      resizeMode="cover"
      style={[styles.background, style]}
      {...rest}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
