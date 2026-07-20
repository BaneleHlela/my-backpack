// Ports apps/web's TrendingTerms.tsx — horizontal FlatList instead of an
// overflow-x-auto div.
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { fetchTrending, type TrendingTermResult } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';

interface TrendingTermsProps {
  miniAppId: string;
  onSelectTerm: (termId: string) => void;
}

export function TrendingTerms({ miniAppId, onSelectTerm }: TrendingTermsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { trending, trendingLoading } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    dispatch(fetchTrending({ miniAppId, limit: 10 }));
  }, [dispatch, miniAppId]);

  if (!trendingLoading && trending.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <TrendingUp size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.headingText}>Trending</Text>
      </View>

      {trendingLoading ? (
        <ActivityIndicator color={colors.primary.light} style={styles.loading} />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={trending}
          keyExtractor={(item: TrendingTermResult) => item.term._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelectTerm(item.term._id)}>
              <GlassCard style={styles.card}>
                <Text style={styles.word} numberOfLines={1}>
                  {item.term.word}
                </Text>
                {item.primaryDefinition ? (
                  <Text style={styles.definition} numberOfLines={1}>
                    {item.primaryDefinition}
                  </Text>
                ) : null}
              </GlassCard>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headingText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  loading: {
    paddingVertical: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    maxWidth: 200,
  },
  word: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.text.primary,
  },
  definition: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
});
