// Ports apps/web's RecentSearches.tsx — same shape as TrendingTerms,
// different data source, wrapped chips instead of a horizontal scroll.
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { History } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { radii, spacing, typography } from '@my-backpack/shared';
import { fetchRecent } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { useTheme } from '../../theme/ThemeContext';

interface RecentSearchesProps {
  miniAppId: string;
  onSelectTerm: (termId: string) => void;
}

export function RecentSearches({ miniAppId, onSelectTerm }: RecentSearchesProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const { recent, recentLoading } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    dispatch(fetchRecent({ miniAppId, limit: 10 }));
  }, [dispatch, miniAppId]);

  if (!recentLoading && recent.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <History size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.headingText}>Recently added</Text>
      </View>

      {recentLoading ? (
        <ActivityIndicator color={colors.primary.light} style={styles.loading} />
      ) : (
        <View style={styles.chips}>
          {recent.map(({ entry, term }) => (
            <Pressable key={entry._id} onPress={() => onSelectTerm(term._id)} style={styles.chip}>
              <Text style={styles.chipText}>{term.word}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
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
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassSoft,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    chipText: {
      fontSize: typography.small,
      color: colors.glassText.secondary,
    },
  });
}
