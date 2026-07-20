// Ports apps/web's BucketPage/components/BucketEntryCard.tsx.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Volume2, Trash2, Brain, Clock3 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { playAudioUrl } from '../../lib/audio';
import type { BucketTermEntryLite } from '../../features/vocab/vocabSlice';

interface BucketEntryCardProps {
  entry: BucketTermEntryLite;
  onSelect: (termId: string) => void;
  onRemove: (termId: string) => void;
  isRemoving: boolean;
}

const ENTRY_STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  learning: { label: 'Learning', bg: colors.primary.light, text: colors.primary.darker },
  mastered: { label: 'Mastered', bg: colors.success.light, text: colors.success.dark },
  paused: { label: 'Paused', bg: colors.surface.glassStrong, text: colors.text.muted },
};

const PROGRESS_STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  unseen: { label: 'Not started', bg: colors.surface.glassStrong, text: colors.text.muted },
  learning: { label: 'In progress', bg: colors.primary.light, text: colors.primary.darker },
  mastered: { label: 'Mastered', bg: colors.warning.light, text: colors.warning.dark },
  reviewing: { label: 'Reviewing', bg: colors.primary.light, text: colors.primary.darker },
};

export function BucketEntryCard({ entry, onSelect, onRemove, isRemoving }: BucketEntryCardProps) {
  const { entry: bucketEntry, term, definition, learningRecord } = entry;

  const entryBadge = ENTRY_STATUS_BADGE[bucketEntry.status] ?? ENTRY_STATUS_BADGE.learning;
  const progressBadge = learningRecord
    ? PROGRESS_STATUS_BADGE[learningRecord.learningStatus] ?? PROGRESS_STATUS_BADGE.unseen
    : PROGRESS_STATUS_BADGE.unseen;

  const confidencePct = learningRecord ? Math.round(learningRecord.confidenceScore * 100) : 0;
  const hasAnswers = !!learningRecord && learningRecord.totalAnswers > 0;
  const accuracyPct = hasAnswers
    ? Math.round((learningRecord!.correctAnswers / learningRecord!.totalAnswers) * 100)
    : 0;
  const isDueForReview = !!learningRecord?.nextReviewAt && new Date(learningRecord.nextReviewAt) <= new Date();

  return (
    <Pressable onPress={() => onSelect(term._id)}>
      <GlassCard intensity="soft">
        <View style={styles.row}>
          <View style={styles.main}>
            <View style={styles.titleRow}>
              <Text style={styles.word}>{term.word}</Text>
              {term.phonetic ? <Text style={styles.phonetic}>{term.phonetic}</Text> : null}
              {term.audioUrl ? (
                <Pressable onPress={() => playAudioUrl(term.audioUrl!)} hitSlop={8}>
                  <Volume2 size={14} color={colors.primary.DEFAULT} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: entryBadge.bg }]}>
                <Text style={[styles.badgeText, { color: entryBadge.text }]}>{entryBadge.label}</Text>
              </View>
              <View style={[styles.badge, styles.badgeWithIcon, { backgroundColor: progressBadge.bg }]}>
                <Brain size={11} color={progressBadge.text} />
                <Text style={[styles.badgeText, { color: progressBadge.text }]}>{progressBadge.label}</Text>
              </View>
              {isDueForReview ? (
                <View style={[styles.badge, styles.badgeWithIcon, { backgroundColor: colors.warning.light }]}>
                  <Clock3 size={11} color={colors.warning.dark} />
                  <Text style={[styles.badgeText, { color: colors.warning.dark }]}>Due for review</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.definition}>
              <Text style={styles.partOfSpeech}>{definition.partOfSpeech} </Text>
              {definition.definition}
            </Text>

            <View style={styles.confidenceRow}>
              <View style={styles.confidenceTrack}>
                <View style={[styles.confidenceFill, { width: `${confidencePct}%` }]} />
              </View>
              <Text style={styles.metaText}>{confidencePct}% confidence</Text>
            </View>

            <View style={styles.footerRow}>
              {hasAnswers ? (
                <Text style={styles.metaText}>
                  {learningRecord!.correctAnswers}/{learningRecord!.totalAnswers} correct ({accuracyPct}%)
                </Text>
              ) : null}
              <Text style={styles.metaText}>
                {learningRecord?.lastAnsweredAt
                  ? `Last practiced ${formatDistanceToNow(new Date(learningRecord.lastAnsweredAt), { addSuffix: true })}`
                  : 'Not yet practiced'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => onRemove(term._id)}
            disabled={isRemoving}
            hitSlop={8}
            style={styles.removeButton}
          >
            <Trash2 size={16} color={colors.text.muted} />
          </Pressable>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  main: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  word: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  phonetic: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgeWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  definition: {
    fontSize: typography.small,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  partOfSpeech: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.primary.DEFAULT,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  confidenceTrack: {
    flex: 1,
    maxWidth: 140,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.glassStrong,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary.light,
    borderRadius: radii.full,
  },
  metaText: {
    fontSize: 11,
    color: colors.text.muted,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  removeButton: {
    padding: spacing.xs,
  },
});
