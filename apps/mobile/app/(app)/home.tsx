import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { AvailableSubject, IMiniApp } from '@my-backpack/shared';
import { GlassCard } from '../../src/components/GlassCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import {
  fetchEnrolledSubjects,
  fetchAvailableSubjects,
  fetchStandaloneMiniApps,
  enrollInSubject,
} from '../../src/features/content/contentSlice';
import type { AppDispatch, RootState } from '../../src/store/store';

const MINI_APP_EMOJI: Record<IMiniApp['type'], string> = {
  dictionary: '📖',
  quiz: '🧠',
  flashcards: '🃏',
  practice: '▶',
  roadmap: '🗺️',
};

function AddSubjectsModal({ onClose }: { onClose: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const { availableSubjects, isLoadingAvailable } = useSelector((state: RootState) => state.content);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAvailableSubjects(undefined));
  }, [dispatch]);

  const handleEnroll = async (subject: AvailableSubject) => {
    setEnrollingId(subject.subject._id);
    const result = await dispatch(enrollInSubject(subject.subject._id));
    if (enrollInSubject.fulfilled.match(result)) {
      setEnrolledIds((prev) => new Set(prev).add(subject.subject._id));
    }
    setEnrollingId(null);
  };

  const handleDone = () => {
    if (enrolledIds.size > 0) dispatch(fetchEnrolledSubjects());
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={handleDone}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a subject</Text>
            <Pressable onPress={handleDone}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>

          {isLoadingAvailable && availableSubjects.length === 0 ? (
            <ActivityIndicator style={styles.modalLoading} color={colors.primary.DEFAULT} />
          ) : (
            <ScrollView>
              {availableSubjects.map((item) => {
                const enrolled = item.isEnrolled || enrolledIds.has(item.subject._id);
                const enrolling = enrollingId === item.subject._id;
                return (
                  <View key={item.subject._id} style={styles.subjectRow}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{item.subject.name}</Text>
                      <Text style={styles.subjectField}>{item.field.name}</Text>
                    </View>
                    {enrolled ? (
                      <Text style={styles.enrolledLabel}>Enrolled</Text>
                    ) : (
                      <PrimaryButton
                        title="Enroll"
                        onPress={() => void handleEnroll(item)}
                        loading={enrolling}
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { enrolledSubjects, standaloneTopicsBySubject, isLoading } = useSelector(
    (state: RootState) => state.content
  );
  const [showAddSubjects, setShowAddSubjects] = useState(false);

  useEffect(() => {
    dispatch(fetchEnrolledSubjects());
  }, [dispatch]);

  useEffect(() => {
    if (!enrolledSubjects) return;
    enrolledSubjects.fields.forEach(({ field, subjects }) => {
      subjects.forEach(({ subject }) => {
        dispatch(fetchStandaloneMiniApps({ fieldSlug: field.slug, subjectSlug: subject.slug, subjectId: subject._id }));
      });
    });
  }, [enrolledSubjects, dispatch]);

  const hasEnrollments = (enrolledSubjects?.fields.length ?? 0) > 0;

  if (isLoading && !enrolledSubjects) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!hasEnrollments) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🎒</Text>
        <Text style={styles.emptyHeading}>Your backpack is empty!</Text>
        <Text style={styles.emptyBody}>Enroll in a subject to start learning.</Text>
        <PrimaryButton title="Add subjects" onPress={() => setShowAddSubjects(true)} style={styles.emptyButton} />
        {showAddSubjects ? <AddSubjectsModal onClose={() => setShowAddSubjects(false)} /> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      {enrolledSubjects?.fields.map(({ subjects }) =>
        subjects.map(({ subject }) => {
          const topics = standaloneTopicsBySubject[subject._id];
          return (
            <View key={subject._id} style={styles.subjectSection}>
              <Text style={styles.subjectHeading}>{subject.name}</Text>

              {topics === undefined ? (
                <ActivityIndicator color={colors.primary.DEFAULT} style={styles.subjectLoading} />
              ) : topics.length === 0 ? (
                <Text style={styles.comingSoon}>More coming soon.</Text>
              ) : (
                topics.map(({ topic, miniApps }) => (
                  <View key={topic._id} style={styles.topicGroup}>
                    <Text style={styles.topicLabel}>{topic.name}</Text>
                    {miniApps.map((app) => (
                      <Pressable
                        key={app._id}
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/miniapp/[miniAppId]',
                            params: { miniAppId: app._id, name: app.name, type: app.type },
                          })
                        }
                      >
                        <GlassCard style={styles.miniAppCard}>
                          <Text style={styles.miniAppEmoji}>{MINI_APP_EMOJI[app.type]}</Text>
                          <Text style={styles.miniAppName}>{app.name}</Text>
                        </GlassCard>
                      </Pressable>
                    ))}
                  </View>
                ))
              )}
            </View>
          );
        })
      )}

      <Pressable onPress={() => setShowAddSubjects(true)} style={styles.addMore}>
        <Text style={styles.addMoreText}>+ Add more subjects</Text>
      </Pressable>

      {showAddSubjects ? <AddSubjectsModal onClose={() => setShowAddSubjects(false)} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyHeading: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyBody: {
    fontSize: typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyButton: {
    minWidth: 180,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  subjectSection: {
    gap: spacing.sm,
  },
  subjectHeading: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subjectLoading: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  comingSoon: {
    fontSize: typography.small,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  topicGroup: {
    gap: spacing.xs,
  },
  topicLabel: {
    fontSize: typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.text.muted,
  },
  miniAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  miniAppEmoji: {
    fontSize: typography.heading,
  },
  miniAppName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addMore: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  addMoreText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalClose: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  modalLoading: {
    paddingVertical: spacing.xl,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  subjectInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  subjectName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subjectField: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  enrolledLabel: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.success.dark,
  },
});
