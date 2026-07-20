// Ports apps/web's DictionaryBrowseList.tsx. Unlike web, this can't be a
// self-contained scrolling component: RN doesn't support nesting a
// scrolling FlatList inside another ScrollView (onEndReached wouldn't fire
// correctly). Instead this exports a data hook + row renderer that the
// Dictionary home screen (index.tsx) plugs directly into its own top-level
// FlatList, so pagination via onEndReached works against the real scroll
// container.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import { browseDictionary, type DictionaryTermPreview } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';

export function useDictionaryBrowse(miniAppId: string, letter: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { browseResults, browsePagination, browseLoading } = useSelector((state: RootState) => state.vocab);

  useEffect(() => {
    dispatch(browseDictionary({ miniAppId, letter, page: 1, limit: 20 }));
  }, [dispatch, miniAppId, letter]);

  const loadMore = () => {
    if (!browsePagination?.hasMore || browseLoading) return;
    dispatch(browseDictionary({ miniAppId, letter, page: browsePagination.page + 1, limit: browsePagination.limit }));
  };

  return { browseResults, browsePagination, browseLoading, loadMore };
}

export function BrowseResultRow({
  term,
  onPress,
}: {
  term: DictionaryTermPreview;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.wordGroup}>
        <Text style={styles.word}>{term.word}</Text>
        {term.phonetic ? <Text style={styles.phonetic}>{term.phonetic}</Text> : null}
      </View>
      {term.audioUrl ? <Volume2 size={14} color={colors.text.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: colors.surface.glassSoft,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.xs / 2,
  },
  wordGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    flexShrink: 1,
  },
  word: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.primary,
  },
  phonetic: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
