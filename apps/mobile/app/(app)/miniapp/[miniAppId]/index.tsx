// Dictionary mini-app home: search, trending, A-Z browse, recent searches.
// Built as a single top-level FlatList (not stacked ScrollViews) so the
// browse results' onEndReached pagination fires against a real scroll
// container — see DictionaryBrowseList.tsx for why.
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, Bookmark } from 'lucide-react-native';
import { colors, spacing, typography } from '@my-backpack/shared';
import { SearchInput } from '../../../../src/components/dictionary/SearchInput';
import { TrendingTerms } from '../../../../src/components/dictionary/TrendingTerms';
import { AlphabetPicker } from '../../../../src/components/dictionary/AlphabetPicker';
import { RecentSearches } from '../../../../src/components/dictionary/RecentSearches';
import { useDictionaryBrowse, BrowseResultRow } from '../../../../src/components/dictionary/DictionaryBrowseList';
import { setBrowseLetter, type DictionaryTermPreview } from '../../../../src/features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../../../src/store/store';

export default function DictionaryHomeScreen() {
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
          <View style={styles.topBar}>
            <Pressable onPress={() => router.replace('/(app)/home')} style={styles.backButton}>
              <ChevronLeft size={18} color={colors.text.secondary} />
              <Text style={styles.backText}>Home</Text>
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

const styles = StyleSheet.create({
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
    padding: spacing.lg,
  },
  row: {
    gap: spacing.xs,
  },
  header: {
    marginBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  bucketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
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
