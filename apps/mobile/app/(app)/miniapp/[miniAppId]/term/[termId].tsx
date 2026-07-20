// Ports apps/web's DictionaryPage/components/TermDetail.tsx as its own
// route (rather than inline state) — matches web's reasoning: linkable,
// supports back navigation.
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, Volume2 } from 'lucide-react-native';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../../../../../src/components/GlassCard';
import { DefinitionCard } from '../../../../../src/components/dictionary/DefinitionCard';
import { playAudioUrl } from '../../../../../src/lib/audio';
import { clearActiveTerm, fetchTermDetail } from '../../../../../src/features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../../../../src/store/store';

export default function TermDetailScreen() {
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
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft size={18} color={colors.text.secondary} />
        <Text style={styles.backText}>Back to search</Text>
      </Pressable>

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
              <Text style={styles.word}>{activeTerm.term.word}</Text>
              {activeTerm.term.phonetic ? <Text style={styles.phonetic}>{activeTerm.term.phonetic}</Text> : null}
              {activeTerm.term.audioUrl ? (
                <Pressable onPress={() => playAudioUrl(activeTerm.term.audioUrl!)} hitSlop={8}>
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

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: typography.small,
    color: colors.text.secondary,
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
    gap: spacing.sm,
  },
  word: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  phonetic: {
    fontSize: typography.body,
    color: colors.text.muted,
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
