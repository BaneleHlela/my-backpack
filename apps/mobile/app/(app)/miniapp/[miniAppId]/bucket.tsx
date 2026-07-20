// Ports apps/web's BucketPage/BucketPage.tsx — status filter tabs, sort,
// list of bucketed terms with confidence/accuracy info and a remove action.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, BookOpen } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../../../../src/components/GlassCard';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { BucketEntryCard } from '../../../../src/components/dictionary/BucketEntryCard';
import {
  fetchBucket,
  removeBucketEntry,
  setBucketStatusFilter,
  type BucketTermEntryLite,
} from '../../../../src/features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../../../src/store/store';

type StatusFilter = 'all' | 'learning' | 'mastered' | 'paused';
type SortOption = 'recent' | 'alphabetical' | 'confidence' | 'accuracy' | 'lastPracticed' | 'dueForReview';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'learning', label: 'Learning' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'paused', label: 'Paused' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'alphabetical', label: 'A-Z' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'lastPracticed', label: 'Last practiced' },
  { value: 'dueForReview', label: 'Due for review' },
];

function sortEntries(entries: BucketTermEntryLite[], sortBy: SortOption): BucketTermEntryLite[] {
  const sorted = [...entries];
  switch (sortBy) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.term.word.localeCompare(b.term.word));
    case 'confidence':
      return sorted.sort(
        (a, b) => (b.learningRecord?.confidenceScore ?? 0) - (a.learningRecord?.confidenceScore ?? 0)
      );
    case 'accuracy':
      return sorted.sort((a, b) => {
        const aAcc =
          a.learningRecord && a.learningRecord.totalAnswers > 0
            ? a.learningRecord.correctAnswers / a.learningRecord.totalAnswers
            : -1;
        const bAcc =
          b.learningRecord && b.learningRecord.totalAnswers > 0
            ? b.learningRecord.correctAnswers / b.learningRecord.totalAnswers
            : -1;
        return bAcc - aAcc;
      });
    case 'lastPracticed':
      return sorted.sort((a, b) => {
        const aTime = a.learningRecord?.lastAnsweredAt ? new Date(a.learningRecord.lastAnsweredAt).getTime() : -Infinity;
        const bTime = b.learningRecord?.lastAnsweredAt ? new Date(b.learningRecord.lastAnsweredAt).getTime() : -Infinity;
        return bTime - aTime;
      });
    case 'dueForReview':
      return sorted.sort((a, b) => {
        const aTime = a.learningRecord?.nextReviewAt ? new Date(a.learningRecord.nextReviewAt).getTime() : Infinity;
        const bTime = b.learningRecord?.nextReviewAt ? new Date(b.learningRecord.nextReviewAt).getTime() : Infinity;
        return aTime - bTime;
      });
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.entry.addedAt).getTime() - new Date(a.entry.addedAt).getTime());
  }
}

export default function BucketScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { miniAppId, name } = useLocalSearchParams<{ miniAppId: string; name?: string }>();
  const { bucket, bucketLoading, bucketError, bucketStatusFilter, removingTermIds } = useSelector(
    (state: RootState) => state.vocab
  );
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const goToTerm = (termId: string) =>
    router.push({ pathname: '/(app)/miniapp/[miniAppId]/term/[termId]', params: { miniAppId, termId } });

  useEffect(() => {
    dispatch(fetchBucket({ miniAppId, status: bucketStatusFilter }));
  }, [dispatch, miniAppId, bucketStatusFilter]);

  const sortedBucket = useMemo(() => sortEntries(bucket, sortBy), [bucket, sortBy]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace({ pathname: '/(app)/miniapp/[miniAppId]', params: { miniAppId, name } })}
          style={styles.backButton}
        >
          <ChevronLeft size={18} color={colors.text.secondary} />
          <Text style={styles.backText}>Back to {name ?? 'Dictionary'}</Text>
        </Pressable>
        <Text style={styles.title}>My Bucket</Text>

        <View style={styles.tabs}>
          {STATUS_TABS.map((tab) => (
            <Pressable
              key={tab.value}
              onPress={() => dispatch(setBucketStatusFilter(tab.value))}
              style={[styles.tab, bucketStatusFilter === tab.value ? styles.tabActive : null]}
            >
              <Text style={[styles.tabText, bucketStatusFilter === tab.value ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSortBy(opt.value)}
              style={[styles.sortChip, sortBy === opt.value ? styles.sortChipActive : null]}
            >
              <Text style={[styles.sortChipText, sortBy === opt.value ? styles.sortChipTextActive : null]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {bucketLoading ? <ActivityIndicator color={colors.primary.light} style={styles.loading} /> : null}

      {bucketError && !bucketLoading ? (
        <GlassCard intensity="soft" style={styles.margin}>
          <Text style={styles.errorText}>{bucketError}</Text>
        </GlassCard>
      ) : null}

      {!bucketLoading && !bucketError && sortedBucket.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={40} color={colors.primary.light} />
          <Text style={styles.emptyTitle}>Your bucket is empty</Text>
          <Text style={styles.emptyBody}>
            Search the dictionary and add words you want to learn — they'll show up here.
          </Text>
          <PrimaryButton
            title="Browse the dictionary"
            onPress={() => router.replace({ pathname: '/(app)/miniapp/[miniAppId]', params: { miniAppId, name } })}
            style={styles.emptyButton}
          />
        </View>
      ) : null}

      {!bucketLoading && !bucketError && sortedBucket.length > 0 ? (
        <FlatList
          data={sortedBucket}
          keyExtractor={(item) => item.entry._id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <BucketEntryCard
              entry={item}
              onSelect={goToTerm}
              onRemove={(termId) => dispatch(removeBucketEntry({ termId, miniAppId }))}
              isRemoving={removingTermIds.includes(item.entry.termId)}
            />
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backText: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  title: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface.glassSoft,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  sortRow: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.glass,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.light,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sortChipTextActive: {
    color: colors.primary.darker,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  margin: {
    marginHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: typography.small,
    color: colors.error.dark,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyBody: {
    fontSize: typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  separator: {
    height: spacing.sm,
  },
});
