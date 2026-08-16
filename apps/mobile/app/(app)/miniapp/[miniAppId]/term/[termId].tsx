// Ports apps/web's DictionaryPage/components/TermDetail.tsx as its own
// route (rather than inline state) — matches web's reasoning: linkable,
// supports back navigation.
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../../../src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Volume2 } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../../../../../src/components/GlassCard';
import { DefinitionCard } from '../../../../../src/components/dictionary/DefinitionCard';
import { Menubar } from '../../../../../src/components/Menubar';
import { playAudioUrl } from '../../../../../src/lib/audio';
import { clearActiveTerm, fetchTermDetail } from '../../../../../src/features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../../../../src/store/store';
import { useTheme } from '../../../../../src/theme/ThemeContext';
import { fonts } from '../../../../../src/theme/fonts';

export default function TermDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { miniAppId, termId } = useLocalSearchParams<{ miniAppId: string; termId: string }>();
  const { activeTerm, activeTermLoading, activeTermError } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    dispatch(fetchTermDetail(termId));
    return () => {
      dispatch(clearActiveTerm());
    };
  }, [dispatch, termId]);

  return (
    <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
      <Menubar label="Back to search" onBackPress={() => router.back()} />

      {activeTermLoading ? <ActivityIndicator color={colors.primary.light} style={styles.loading} /> : null}

      {activeTermError && !activeTermLoading ? (
        <GlassCard intensity="soft">
          <Text style={styles.errorText}>{activeTermError}</Text>
        </GlassCard>
      ) : null}

      {!activeTermLoading && !activeTermError && activeTerm ? (
        <>
          <GlassCard>
            <View style={styles.wordRow}>
              <View style={styles.wordGroup}>
                <Text style={styles.word}>{activeTerm.term.word}</Text>
                {activeTerm.term.phonetic ? <Text style={styles.phonetic}>{activeTerm.term.phonetic}</Text> : null}
              </View>
              {activeTerm.term.audioUrl ? (
                <Pressable onPress={() => playAudioUrl(activeTerm.term.audioUrl!)} hitSlop={8} style={styles.audioButton}>
                  <Volume2 size={18} color={colors.primary.DEFAULT} />
                </Pressable>
              ) : null}
            </View>
          </GlassCard>

          {activeTerm.definitions.length === 0 ? (
            <Text style={styles.emptyText}>No definitions available for this word yet.</Text>
          ) : (
            <View style={styles.definitions}>
              {activeTerm.definitions.map((entry, i) => (
                <DefinitionCard
                  key={entry.definition._id}
                  termId={termId}
                  miniAppId={miniAppId}
                  index={i}
                  entry={entry}
                />
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: typography.small,
    color: colors.error.dark,
    textAlign: 'center',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  wordGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  word: {
    fontFamily: fonts.display.bold,
    fontSize: typography.headingLg,
    color: colors.glassText.primary,
  },
  phonetic: {
    fontSize: typography.body,
    color: colors.glassText.muted,
  },
  audioButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.glassSoft,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.small,
    color: colors.text.muted,
    paddingVertical: spacing.lg,
  },
  definitions: {
    gap: spacing.sm,
  },
  });
}
