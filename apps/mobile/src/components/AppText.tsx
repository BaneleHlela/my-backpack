// Central default-font wrapper for React Native's <Text>. Unlike apps/web (where Tailwind's
// Preflight cascades a `font-family` from `html` down through every element for free — see
// apps/web/tailwind.config.ts), RN has no font-family inheritance at all: every <Text> falls
// back to the OS default unless it sets its own `fontFamily`. This component is the "one place"
// that default lives — import { Text } from './AppText' (or the relative path to this file)
// instead of 'react-native' and Nunito Sans (see ../theme/fonts.ts) applies automatically.
//
// An explicit `fontFamily` in a passed `style` always wins — RN's array-style flattening applies
// later entries over earlier ones for the same key — so display-font (Fredoka) headings and any
// other per-instance override still work exactly as before, unchanged.
import { forwardRef } from 'react';
import { Text as RNText, StyleSheet, type Text as RNTextInstance, type TextProps } from 'react-native';
import { fonts } from '../theme/fonts';

export const Text = forwardRef<RNTextInstance, TextProps>(function Text({ style, ...props }, ref) {
  return <RNText ref={ref} style={[styles.default, style]} {...props} />;
});

const styles = StyleSheet.create({
  default: {
    fontFamily: fonts.body.regular,
  },
});
