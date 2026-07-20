// Ports apps/web's AlphabetPicker.tsx — letter grid as wrapped pressable
// chips; active/available/unavailable states match web exactly.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import { fetchAlphabet } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

interface AlphabetPickerProps {
  miniAppId: string;
  activeLetter: string;
  onSelectLetter: (letter: string) => void;
}

export function AlphabetPicker({ miniAppId, activeLetter, onSelectLetter }: AlphabetPickerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { alphabet } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    dispatch(fetchAlphabet(miniAppId));
  }, [dispatch, miniAppId]);

  return (
    <View style={styles.grid}>
      {LETTERS.map((letter) => {
        const available = alphabet.includes(letter);
        const isActive = letter === activeLetter;
        return (
          <Pressable
            key={letter}
            disabled={!available}
            onPress={() => onSelectLetter(letter)}
            style={[
              styles.letter,
              isActive ? styles.letterActive : available ? styles.letterAvailable : styles.letterUnavailable,
            ]}
          >
            <Text
              style={[
                styles.letterText,
                isActive ? styles.letterTextActive : available ? styles.letterTextAvailable : styles.letterTextUnavailable,
              ]}
            >
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  letterAvailable: {
    backgroundColor: colors.surface.glass,
  },
  letterUnavailable: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  letterText: {
    fontSize: typography.small,
    fontWeight: '700',
  },
  letterTextActive: {
    color: '#fff',
  },
  letterTextAvailable: {
    color: colors.text.secondary,
  },
  letterTextUnavailable: {
    color: colors.text.faint,
  },
});
