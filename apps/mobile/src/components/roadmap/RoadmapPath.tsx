// Flattened Course path — Course & Topic redesign, Phase C. Renders one NodeButton per ITEM
// across ALL nodes in position order (not one card/circle per node, as the pre-redesign
// RoadmapNodeCard.tsx/RoadmapNodeCircle.tsx did), inserting each node's title as a non-tappable
// section banner at the start of its run of items — ports the Figma course page (file
// OaE5PxSOT5p8Fby7SUpoP7, node 22:27039) exactly: there is only one flat-path layout in that file
// (Light and Dark theme variants, no separate Adult-mode frame), so this replaces both of the old
// age-branched components rather than keeping one for adult/teen.
//
// The per-node "N stars" summary (Figma's "Topic Stars") is rendered once, after a completed
// node's last item — it's node-level data (INodeProgressEntry.stars), not per-item, so it isn't
// part of NodeButton itself. Figma's mockup has no connecting line/road between buttons (unlike
// the pre-redesign winding SVG path), so none is drawn here — just the buttons and banners,
// following the reference exactly.
//
// The existing progress header (X of Y items complete, % bar) lives in CourseScreen.tsx, above
// this component, and is untouched by this rewrite.
import { useState, type ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { NodeItemWithProgress, RoadmapWithProgress } from '@my-backpack/shared';
import NodeButton, { NODE_BUTTON_COMPLETED_EXTRA_HEIGHT, NODE_BUTTON_SIZE, type NodeButtonProgress } from './NodeButton';
import { useTheme } from '../../theme/ThemeContext';

interface RoadmapPathProps {
  roadmap: RoadmapWithProgress;
  onSelectLesson: (lessonId: string, nodeId: string, nodeTitle: string) => void;
  // allowPlayModes mirrors Quiz.allowPlayModes for this specific item — the caller decides
  // whether to open the Quiz Mode Select screen or start the ordinary session directly.
  onSelectQuiz: (itemId: string, nodeId: string, allowPlayModes: boolean) => void;
}

const ITEM_SPACING = 110;
const BANNER_HEIGHT = 60;
const STARS_HEIGHT = 50;
const LEFT_X_FRACTION = 0.3;
const RIGHT_X_FRACTION = 0.58;

function toProgress(status: NodeItemWithProgress['progressStatus'], isUnlocked: boolean): NodeButtonProgress {
  if (!isUnlocked || status === 'locked') return 'locked';
  if (status === 'completed') return 'completed';
  return 'current';
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export default function RoadmapPath({ roadmap, onSelectLesson, onSelectQuiz }: RoadmapPathProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Flatten nodes -> banner + item rows, tracking a running item index for the x-wind and a
  // running y offset for vertical placement (tighter within a node, extra room at node/stars
  // boundaries).
  let y = 0;
  let itemIndex = 0;
  const rows: ReactNode[] = [];

  for (const node of roadmap.nodes) {
    rows.push(
      <View key={`banner-${node._id}`} style={[styles.banner, { top: y }]}>
        <View style={styles.bannerLine} />
        <Text style={styles.bannerText} numberOfLines={2}>
          {node.title}
        </Text>
        <View style={styles.bannerLine} />
      </View>
    );
    y += BANNER_HEIGHT;

    const items = node.items as unknown as NodeItemWithProgress[];
    items.forEach((item) => {
      const x = itemIndex % 2 === 0 ? containerWidth * LEFT_X_FRACTION : containerWidth * RIGHT_X_FRACTION;
      const progress = toProgress(item.progressStatus, item.isUnlocked);
      const itemId = item.itemType === 'lesson' ? item.lesson._id : item.quiz._id;

      rows.push(
        <View key={itemId} style={[styles.itemWrapper, { left: x, top: y }]}>
          <NodeButton
            itemType={item.itemType}
            progress={progress}
            onPress={() => {
              if (progress === 'locked') return;
              if (item.itemType === 'lesson') {
                onSelectLesson(item.lesson._id, node._id, node.title);
              } else {
                onSelectQuiz(item.quiz._id, node._id, item.quiz.allowPlayModes);
              }
            }}
          />
        </View>
      );
      // NodeButton renders its own 3-star decoration directly below a completed badge — leave it
      // the extra room it needs so the next item on the path doesn't sit on top of those stars.
      y += ITEM_SPACING + (progress === 'completed' ? NODE_BUTTON_COMPLETED_EXTRA_HEIGHT : 0);
      itemIndex += 1;
    });

    if (node.progressStatus === 'completed') {
      rows.push(
        <View key={`stars-${node._id}`} style={[styles.starsRow, { top: y }]}>
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              size={24}
              color={s <= node.stars ? colors.warning.DEFAULT : colors.text.faint}
              fill={s <= node.stars ? colors.warning.DEFAULT : 'transparent'}
            />
          ))}
        </View>
      );
      y += STARS_HEIGHT;
    }
  }

  return (
    <View onLayout={handleLayout} style={{ height: y }}>
      {containerWidth > 0 && rows}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    bannerLine: {
      flex: 1,
      height: 3,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.border,
      maxWidth: 87,
    },
    bannerText: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    itemWrapper: {
      position: 'absolute',
      width: NODE_BUTTON_SIZE,
      marginLeft: -NODE_BUTTON_SIZE / 2,
    },
    starsRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
  });
}
