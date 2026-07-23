// Bottom-sheet panel shown when a node is tapped, listing its items[] (lesson or quiz) with
// per-item progress. Ports apps/web's NodeLessonsPanel.tsx — only the mobile bottom-sheet
// variant (web also has a desktop side-panel variant mobile doesn't need). Built on a plain
// RN Modal with animationType="slide" (already gives the bottom-sheet slide-up motion for
// free) + the same overlay/sheet pattern already used by home.tsx's AddSubjectsModal, rather
// than a new bottom-sheet library. Navigates directly via expo-router's useRouter(), mirroring
// web's own useNavigate() calls inside this component rather than delegating navigation to a
// parent callback.
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, Lock, Play, Star, X } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { ItemStatus, NodeItemType, NodeStatus } from '@my-backpack/shared';

interface ItemForPanel {
  _id: string;
  itemType: NodeItemType;
  title: string;
  questionCount?: number; // only present for itemType === 'quiz'
  progressStatus: ItemStatus;
  isUnlocked: boolean;
}

export interface NodeForPanel {
  _id: string;
  title: string;
  description?: string;
  stars: number;
  isUnlocked: boolean;
  progressStatus: NodeStatus;
  items: ItemForPanel[];
}

interface NodeLessonsPanelProps {
  node: NodeForPanel;
  subjectSlug: string;
  courseSlug: string;
  onClose: () => void;
}

const ITEM_TYPE_META: Record<NodeItemType, { label: string; color: string }> = {
  lesson: { label: 'Study', color: colors.primary.DEFAULT },
  quiz: { label: 'Quiz', color: colors.primary.dark },
};

export default function NodeLessonsPanel({ node, subjectSlug, courseSlug, onClose }: NodeLessonsPanelProps) {
  const router = useRouter();

  const handleItemPress = (item: ItemForPanel) => {
    if (!item.isUnlocked) return;
    onClose();
    if (item.itemType === 'lesson') {
      router.push({
        pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]/lesson/[lessonId]',
        params: { subjectSlug, courseSlug, lessonId: item._id },
      });
    } else {
      router.push({
        pathname: '/quiz/[itemId]',
        params: { itemId: item._id, nodeId: node._id, subjectSlug, courseSlug },
      });
    }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* No-op onPress swallows taps so they don't bubble to the backdrop's onClose. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{node.title}</Text>
              {node.description ? <Text style={styles.description}>{node.description}</Text> : null}
              {node.stars > 0 && (
                <View style={styles.starsRow}>
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      color={s <= node.stars ? colors.warning.DEFAULT : colors.text.faint}
                      fill={s <= node.stars ? colors.warning.DEFAULT : 'transparent'}
                    />
                  ))}
                </View>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.text.muted} />
            </Pressable>
          </View>

          <View style={styles.dragHandle} />

          <ScrollView contentContainerStyle={styles.listContent}>
            {node.items.map((item, i) => {
              const meta = ITEM_TYPE_META[item.itemType];
              const isLocked = !item.isUnlocked;
              const isDone = item.progressStatus === 'completed';
              const isActive = item.progressStatus === 'unlocked' || item.progressStatus === 'in_progress';

              return (
                <Pressable
                  key={item._id}
                  onPress={() => handleItemPress(item)}
                  disabled={isLocked}
                  style={[styles.itemRow, isLocked && styles.itemLocked]}
                >
                  <View
                    style={[
                      styles.itemNumber,
                      {
                        backgroundColor: isDone
                          ? colors.success.DEFAULT
                          : isActive
                            ? colors.primary.DEFAULT
                            : colors.surface.glassSoft,
                      },
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle size={16} color="#fff" />
                    ) : isLocked ? (
                      <Lock size={14} color={colors.text.muted} />
                    ) : (
                      <Text style={styles.itemNumberText}>{i + 1}</Text>
                    )}
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.itemMetaRow}>
                      <Text style={[styles.itemBadge, { color: meta.color }]}>{meta.label}</Text>
                      {item.itemType === 'quiz' && item.questionCount !== undefined && (
                        <Text style={styles.itemMetaText}>
                          Has {item.questionCount} question{item.questionCount === 1 ? '' : 's'}
                        </Text>
                      )}
                    </View>
                  </View>

                  {!isLocked && !isDone && (
                    <Play
                      size={16}
                      color={isActive ? colors.primary.DEFAULT : colors.text.muted}
                      fill={isActive ? colors.primary.DEFAULT : 'transparent'}
                    />
                  )}
                </Pressable>
              );
            })}

            {node.items.length === 0 && <Text style={styles.emptyText}>No items yet.</Text>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '75%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surface.border,
    marginVertical: spacing.sm,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface.glassSoft,
  },
  itemLocked: {
    opacity: 0.5,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: '#fff',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemBadge: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  itemMetaText: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.small,
    color: colors.text.muted,
    paddingVertical: spacing.lg,
  },
});
