// Dictionary mini-app home: search, trending, A-Z browse, recent searches.
// Built as a single top-level FlatList (not stacked ScrollViews) so the
// browse results' onEndReached pagination fires against a real scroll
// container — see DictionaryBrowseList.tsx for why.
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../../src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Bookmark, Sparkles } from 'lucide-react-native';
import { spacing, typography } from '@my-backpack/shared';
import { SearchInput } from '../../../../src/components/dictionary/SearchInput';
import { TrendingTerms } from '../../../../src/components/dictionary/TrendingTerms';
import { AlphabetPicker } from '../../../../src/components/dictionary/AlphabetPicker';
import { RecentSearches } from '../../../../src/components/dictionary/RecentSearches';
import { useDictionaryBrowse, BrowseResultRow } from '../../../../src/components/dictionary/DictionaryBrowseList';
import { setBrowseLetter, type DictionaryTermPreview } from '../../../../src/features/vocab/vocabSlice';
import { Menubar } from '../../../../src/components/Menubar';
import type { AppDispatch, RootState } from '../../../../src/store/store';
import { useTheme } from '../../../../src/theme/ThemeContext';

export default function DictionaryHomeScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { miniAppId, name, type } = useLocalSearchParams<{ miniAppId: string; name?: string; type?: string }>();
  const { browseLetter } = useSelector((state: RootState) => state.vocab);
  const { browseResults, browsePagination, browseLoading, loadMore } = useDictionaryBrowse(
    miniAppId,
    browseLetter
  );

  const goToTerm = (termId: string) =>
    router.push({ pathname: '/(app)/miniapp/[miniAppId]/term/[termId]', params: { miniAppId, termId } });

  if (type && type !== 'dictionary') {
    return (
      <View style={styles.center}>
        <Text style={styles.comingSoonText}>Coming soon.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={browseResults}
      keyExtractor={(item: DictionaryTermPreview) => item._id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.listContent}
      onEndReachedThreshold={0.5}
      onEndReached={loadMore}
      renderItem={({ item }) => <BrowseResultRow term={item} onPress={() => goToTerm(item._id)} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Menubar label="Home" onBackPress={() => router.replace('/(app)/home')} />

          <View style={styles.topBarActions}>
            <Pressable
              onPress={() => router.push({ pathname: '/quiz/modes/dictionary/[miniAppId]', params: { miniAppId, name } })}
              style={styles.bucketButton}
            >
              <Sparkles size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.bucketButtonText}>Take Quiz</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/miniapp/[miniAppId]/bucket', params: { miniAppId, name } })}
              style={styles.bucketButton}
            >
              <Bookmark size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.bucketButtonText}>My Bucket</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{name ?? 'Dictionary'}</Text>

          <SearchInput miniAppId={miniAppId} onSelectTerm={goToTerm} />

          <View style={styles.section}>
            <TrendingTerms miniAppId={miniAppId} onSelectTerm={goToTerm} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Browse by letter</Text>
            <AlphabetPicker
              miniAppId={miniAppId}
              activeLetter={browseLetter.toUpperCase()}
              onSelectLetter={(letter) => dispatch(setBrowseLetter(letter))}
            />
          </View>
        </View>
      }
      ListEmptyComponent={
        browseLoading ? (
          <ActivityIndicator color={colors.primary.light} style={styles.loading} />
        ) : (
          <Text style={styles.emptyText}>No words starting with "{browseLetter}" yet.</Text>
        )
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {browseLoading && browseResults.length > 0 ? (
            <ActivityIndicator color={colors.primary.light} style={styles.loading} />
          ) : null}
          {!browsePagination?.hasMore ? (
            <View style={styles.section}>
              <RecentSearches miniAppId={miniAppId} onSelectTerm={goToTerm} />
            </View>
          ) : null}
        </View>
      }
    />
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    fontSize: typography.body,
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  header: {
    marginBottom: spacing.sm,
  },
  topBarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  bucketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.surface.glass,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  bucketButtonText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  title: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.small,
    color: colors.text.muted,
    paddingVertical: spacing.lg,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
  });
}
