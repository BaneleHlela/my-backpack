// Quiz History — every quiz attempt (roadmap Topic quizzes + Dictionary/pool quizzes) a profile
// has taken, filterable by course/topic and status, with score, review, and retake actions. Ports
// apps/web's pages/quizHistory/QuizHistoryPage.tsx. A global screen (not scoped to one course/
// mini-app) — reached from QuizModeSelectScreen's and QuizPickerModal's "Quiz History" entries,
// optionally pre-filtered via the contextId/nodeId params they pass. An ordinary nested route
// inside (app) (not a root-level fullScreenModal like the quiz players) — same reasoning as
// Course Chat's hub: a browsing screen, not a full-screen player, so AppLayout's ScreenBackground/
// ProtectedRoute wrapping already covers it with no extra chrome needed here.
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, History as HistoryIcon, RotateCcw } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { QuizHistoryEntry } from '@my-backpack/shared';
import { GlassCard } from '../../../src/components/GlassCard';
import { Menubar } from '../../../src/components/Menubar';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fonts } from '../../../src/theme/fonts';
import {
  fetchQuizHistory,
  fetchHistoryFilterOptions,
  setHistoryFilters,
  setHistoryPage,
  type HistoryStatusFilter,
} from '../../../src/features/quizHistory/quizHistorySlice';
import { canRetake, navigateToRetake } from '../../../src/components/quiz/quizHistoryLinks';
import type { AppDispatch, RootState } from '../../../src/store/store';

const STATUS_TABS: { value: HistoryStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function QuizHistoryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { contextId: initialContextId, nodeId: initialNodeId } = useLocalSearchParams<{
    contextId?: string;
    nodeId?: string;
  }>();

  const { items, total, page, limit, filters, status, error, filterOptions } = useSelector(
    (state: RootState) => state.quizHistory
  );

  // Seed filters from the entry-point params exactly once on mount.
  useEffect(() => {
    if (initialContextId || initialNodeId) {
      dispatch(setHistoryFilters({ contextId: initialContextId, nodeId: initialNodeId }));
    }
    dispatch(fetchHistoryFilterOptions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(
      fetchQuizHistory({
        contextId: filters.contextId,
        nodeId: filters.nodeId,
        status: filters.status,
        page,
        limit,
      })
    );
  }, [dispatch, filters.contextId, filters.nodeId, filters.status, page, limit]);

  const topicsForSelectedCourse = filters.contextId
    ? (filterOptions?.topics ?? []).filter((t) => t.contextId === filters.contextId)
    : filterOptions?.topics ?? [];

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function scoreBadgeColors(entry: QuizHistoryEntry) {
    if (entry.status === 'abandoned') return { bg: colors.surface.glassStrong, text: colors.text.muted };
    if (entry.percentageScore >= 70) return { bg: colors.success.light, text: colors.success.dark };
    if (entry.percentageScore >= 40) return { bg: colors.warning.light, text: colors.warning.dark };
    return { bg: colors.error.light, text: colors.error.dark };
  }

  return (
    <View style={styles.flex}>
      <FlatList
        stickyHeaderIndices={[0]}
        data={items}
        keyExtractor={(item) => item.sessionId}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Menubar label="Back" onBackPress={() => router.back()} />
            <Text style={styles.title}>Quiz History</Text>

            <View style={styles.tabs}>
              {STATUS_TABS.map((tab) => (
                <Pressable
                  key={tab.value}
                  onPress={() => dispatch(setHistoryFilters({ status: tab.value }))}
                  style={[styles.tab, filters.status === tab.value ? styles.tabActive : null]}
                >
                  <Text style={[styles.tabText, filters.status === tab.value ? styles.tabTextActive : null]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                onPress={() => dispatch(setHistoryFilters({ contextId: undefined, nodeId: undefined }))}
                style={[styles.chip, !filters.contextId ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, !filters.contextId ? styles.chipTextActive : null]}>All courses</Text>
              </Pressable>
              {(filterOptions?.courses ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => dispatch(setHistoryFilters({ contextId: c.id, nodeId: undefined }))}
                  style={[styles.chip, filters.contextId === c.id ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, filters.contextId === c.id ? styles.chipTextActive : null]}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {topicsForSelectedCourse.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable
                  onPress={() => dispatch(setHistoryFilters({ nodeId: undefined }))}
                  style={[styles.chip, !filters.nodeId ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, !filters.nodeId ? styles.chipTextActive : null]}>All topics</Text>
                </Pressable>
                {topicsForSelectedCourse.map((t) => (
                  <Pressable
                    key={t.nodeId}
                    onPress={() => dispatch(setHistoryFilters({ nodeId: t.nodeId }))}
                    style={[styles.chip, filters.nodeId === t.nodeId ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, filters.nodeId === t.nodeId ? styles.chipTextActive : null]}>
                      {t.nodeTitle}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                disabled={page <= 1}
                onPress={() => dispatch(setHistoryPage(page - 1))}
                style={[styles.pageButton, page <= 1 ? styles.pageButtonDisabled : null]}
              >
                <Text style={styles.pageButtonText}>Prev</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Pressable
                disabled={page >= totalPages}
                onPress={() => dispatch(setHistoryPage(page + 1))}
                style={[styles.pageButton, page >= totalPages ? styles.pageButtonDisabled : null]}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const badge = scoreBadgeColors(item);
          const retakeable = canRetake(item);
          return (
            <GlassCard intensity="soft">
              <View style={styles.rowTop}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.quizTitle}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.contextName}
                    {item.nodeTitle ? ` · ${item.nodeTitle}` : ''}
                  </Text>
                  <Text style={styles.rowDate}>
                    {formatDate(item.completedAt ?? item.startedAt)}
                    {item.status === 'abandoned' ? ' · Abandoned' : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.percentageScore}%</Text>
                </View>
              </View>

              <View style={styles.rowBottom}>
                <Text style={styles.correctText}>
                  {item.correct}/{item.totalQuestions} correct
                </Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/quiz-history/[sessionId]',
                        params: { sessionId: item.sessionId },
                      })
                    }
                    style={styles.actionButton}
                  >
                    <Eye size={14} color={colors.text.secondary} />
                    <Text style={styles.actionButtonText}>Review</Text>
                  </Pressable>
                  <Pressable
                    disabled={!retakeable}
                    onPress={() => retakeable && navigateToRetake(router, item)}
                    style={[
                      styles.actionButton,
                      styles.retakeButton,
                      !retakeable ? styles.retakeButtonDisabled : null,
                    ]}
                  >
                    <RotateCcw size={14} color="#fff" />
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          );
        }}
      />
    </View>
  );
}
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    header: { padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
    title: { fontFamily: fonts.display.bold, fontSize: typography.headingLg, color: colors.text.primary },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface.glassSoft,
      borderRadius: radii.md,
      padding: 4,
      gap: 4,
    },
    tab: { flex: 1, paddingVertical: spacing.xs, borderRadius: radii.sm, alignItems: 'center' },
    tabActive: { backgroundColor: colors.primary.DEFAULT },
    tabText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    tabTextActive: { color: '#fff' },
    chipRow: { gap: spacing.xs },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glass,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    chipActive: { backgroundColor: colors.primary.light, borderColor: colors.primary.light },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    chipTextActive: { color: colors.primary.darker },
    loading: { paddingVertical: spacing.xl },
    margin: { marginHorizontal: spacing.lg },
    errorText: { fontSize: typography.small, color: colors.error.dark, textAlign: 'center' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },
    emptyTitle: { fontSize: typography.body, fontWeight: '700', color: colors.text.primary },
    emptyBody: { fontSize: typography.small, color: colors.text.secondary, textAlign: 'center', maxWidth: 280 },
    listContent: { padding: spacing.md, paddingTop: 0 },
    separator: { height: spacing.sm },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    rowTextWrap: { flex: 1 },
    rowTitle: { fontSize: typography.body, fontWeight: '600', color: colors.text.primary },
    rowSubtitle: { fontSize: typography.small, color: colors.text.muted, marginTop: 2 },
    rowDate: { fontSize: 11, color: colors.text.faint, marginTop: 2 },
    badge: { paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radii.sm, alignSelf: 'flex-start' },
    badgeText: { fontSize: 12, fontWeight: '700' },
    rowBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    correctText: { fontSize: typography.small, color: colors.text.muted },
    actionsRow: { flexDirection: 'row', gap: spacing.xs },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.xs,
      paddingVertical: 6,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.glassStrong,
    },
    retakeButton: { backgroundColor: colors.primary.DEFAULT },
    retakeButtonDisabled: { backgroundColor: colors.text.faint },
    actionButtonText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    retakeButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingTop: spacing.md,
    },
    pageButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.glass,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    pageButtonDisabled: { opacity: 0.4 },
    pageButtonText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    pageLabel: { fontSize: 12, color: colors.text.muted },
  });
}
