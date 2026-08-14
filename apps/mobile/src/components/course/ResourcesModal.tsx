// Course-wide resources browser — Course & Topic redesign, Phase C. Same Videos/Notes tab
// structure as LessonModal.tsx, but aggregates every lesson's video resources across the WHOLE
// course (not just one lesson), grouped by node/topic title as a section header per group
// ("Lesson Content: {node title}"), matching the Figma "Resources Modal" frame (file
// OaE5PxSOT5p8Fby7SUpoP7, node 49:912). Pulls only from `Lesson.resources` already present in
// the roadmap-with-progress response (`RoadmapWithProgress.nodes[].items[].lesson.resources`) —
// no new API call, and no teacher-added supplementary resource data exists yet (that's separate,
// later, web-side Studio work).
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Video, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { NodeItemWithProgress, RoadmapWithProgress } from '@my-backpack/shared';
import { LessonVideo } from '../lesson/LessonVideo';
import { PrimaryButton } from '../PrimaryButton';
import { useTheme } from '../../theme/ThemeContext';

interface ResourcesModalProps {
  roadmap: RoadmapWithProgress;
  onClose: () => void;
}

type Tab = 'videos' | 'notes';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function ResourcesModal({ roadmap, onClose }: ResourcesModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [tab, setTab] = useState<Tab>('videos');

  const groups = roadmap.nodes
    .map((node) => {
      const items = node.items as unknown as NodeItemWithProgress[];
      const videos = items
        .filter((item): item is Extract<NodeItemWithProgress, { itemType: 'lesson' }> => item.itemType === 'lesson')
        .flatMap((item) => item.lesson.resources)
        .filter((r) => r.type === 'video' && r.url)
        .sort((a, b) => a.position - b.position);
      return { nodeId: node._id, title: node.title, videos };
    })
    .filter((g) => g.videos.length > 0);

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={20} color={colors.text.muted} />
          </Pressable>

          <View style={styles.tabBar}>
            <Pressable style={styles.tabButton} onPress={() => setTab('videos')}>
              <Video size={22} color={tab === 'videos' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'videos' && { color: colors.primary.DEFAULT }]}>Videos</Text>
            </Pressable>
            <View style={styles.tabDivider} />
            <Pressable style={styles.tabButton} onPress={() => setTab('notes')}>
              <BookOpen size={22} color={tab === 'notes' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'notes' && { color: colors.primary.DEFAULT }]}>Notes</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {tab === 'videos' ? (
              groups.length === 0 ? (
                <Text style={styles.emptyText}>No videos available for this course yet.</Text>
              ) : (
                groups.map((group) => (
                  <View key={group.nodeId} style={styles.group}>
                    <Text style={styles.groupHeading} numberOfLines={1}>
                      Lesson Content: {group.title}
                    </Text>
                    {group.videos.map((resource, i) => (
                      <LessonVideo
                        key={i}
                        url={resource.url!}
                        caption={resource.caption}
                        thumbnailUrl={resource.thumbnailUrl}
                        description={resource.description}
                      />
                    ))}
                  </View>
                ))
              )
            ) : (
              <View style={styles.notesEmpty}>
                <Text style={styles.emptyText}>No available notes for this lesson.</Text>
                <PrimaryButton title="Add notes" onPress={() => {}} disabled />
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      height: '90%',
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    dragHandle: {
      alignSelf: 'center',
      width: 80,
      height: 5,
      borderRadius: radii.sm,
      backgroundColor: colors.text.secondary,
    },
    closeButton: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    tabDivider: {
      width: 1.5,
      height: 30,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.border,
    },
    tabLabel: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.text.muted,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.md,
    },
    group: {
      gap: spacing.md,
    },
    groupHeading: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    emptyText: {
      textAlign: 'center',
      fontSize: typography.small,
      color: colors.text.muted,
      paddingVertical: spacing.lg,
    },
    notesEmpty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
  });
}
