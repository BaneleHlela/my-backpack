// Renders the full roadmap — winding circles for children, card list for adults/teens. Ports
// apps/web's RoadmapPath.tsx: the winding-path math (buildWindingPath) is pure arithmetic with
// no DOM APIs, so it's a 1:1 port using react-native-svg (already a dependency) instead of an
// inline <svg>; container width comes from onLayout instead of a ResizeObserver.
import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, spacing } from '@my-backpack/shared';
import type { AgeGroup, NodeItemWithProgress, RoadmapWithProgress } from '@my-backpack/shared';
import RoadmapNodeCircle from './RoadmapNodeCircle';
import RoadmapNodeCard from './RoadmapNodeCard';
import NodeLessonsPanel, { type NodeForPanel } from './NodeLessonsPanel';

interface RoadmapPathProps {
  roadmap: RoadmapWithProgress;
  ageGroup: AgeGroup;
  subjectSlug: string;
  courseSlug: string;
}

const NODE_SPACING = 140;
const NODE_RADIUS = 40;

function buildWindingPath(nodeCount: number, w: number): string {
  if (nodeCount < 2 || w === 0) return '';
  const leftX = w * 0.3;
  const rightX = w * 0.7;
  let d = '';

  for (let i = 0; i < nodeCount - 1; i++) {
    const fromX = i % 2 === 0 ? leftX : rightX;
    const toX = i % 2 === 0 ? rightX : leftX;
    const fromY = i * NODE_SPACING + NODE_RADIUS;
    const toY = (i + 1) * NODE_SPACING + NODE_RADIUS;

    if (i === 0) d += `M ${fromX} ${fromY}`;
    const mid = (toY - fromY) * 0.5;
    d += ` C ${fromX} ${fromY + mid} ${toX} ${toY - mid} ${toX} ${toY}`;
  }
  return d;
}

// Coerce RoadmapWithProgress node to the panel-compatible shape.
function toNodeForPanel(node: RoadmapWithProgress['nodes'][number]): NodeForPanel {
  return {
    _id: node._id,
    title: node.title,
    description: node.description,
    stars: node.stars,
    isUnlocked: node.isUnlocked,
    progressStatus: node.progressStatus,
    items: (node.items as unknown as NodeItemWithProgress[]).map((item) =>
      item.itemType === 'lesson'
        ? {
            _id: item.lesson._id,
            itemType: 'lesson' as const,
            title: item.lesson.title,
            progressStatus: item.progressStatus,
            isUnlocked: item.isUnlocked,
          }
        : {
            _id: item.quiz._id,
            itemType: 'quiz' as const,
            title: item.quiz.title,
            questionCount: item.quiz.questionCount,
            progressStatus: item.progressStatus,
            isUnlocked: item.isUnlocked,
          }
    ),
  };
}

export default function RoadmapPath({ roadmap, ageGroup, subjectSlug, courseSlug }: RoadmapPathProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedNode, setSelectedNode] = useState<NodeForPanel | null>(null);

  const nodes = roadmap.nodes;

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handleNodePress = (node: RoadmapWithProgress['nodes'][number]) => {
    if (!node.isUnlocked) return;
    setSelectedNode(toNodeForPanel(node));
  };

  const panel = selectedNode && (
    <NodeLessonsPanel
      node={selectedNode}
      subjectSlug={subjectSlug}
      courseSlug={courseSlug}
      onClose={() => setSelectedNode(null)}
    />
  );

  if (ageGroup === 'child') {
    const svgHeight = nodes.length * NODE_SPACING + NODE_RADIUS * 2;
    const pathD = buildWindingPath(nodes.length, containerWidth);

    return (
      <View onLayout={handleLayout} style={{ height: svgHeight }}>
        {containerWidth > 0 && (
          <Svg style={StyleSheet.absoluteFill} width={containerWidth} height={svgHeight}>
            <Defs>
              <LinearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary.light} />
                <Stop offset="100%" stopColor={colors.success.DEFAULT} />
              </LinearGradient>
            </Defs>
            <Path
              d={pathD}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="8 6"
              opacity={0.6}
            />
          </Svg>
        )}

        {containerWidth > 0 &&
          nodes.map((node, i) => {
            const x = i % 2 === 0 ? containerWidth * 0.3 : containerWidth * 0.7;
            const y = i * NODE_SPACING + NODE_RADIUS;
            return (
              <View key={node._id} style={[styles.circleWrapper, { left: x - NODE_RADIUS, top: y - NODE_RADIUS }]}>
                <RoadmapNodeCircle
                  title={node.title}
                  status={node.progressStatus}
                  stars={node.stars}
                  onPress={() => handleNodePress(node)}
                />
              </View>
            );
          })}

        {panel}
      </View>
    );
  }

  // Adult / teen: card list
  return (
    <View>
      <View style={styles.cardList}>
        {nodes.map((node) => {
          const panelNode = toNodeForPanel(node);
          const completedItems = panelNode.items.filter((i) => i.progressStatus === 'completed').length;
          return (
            <RoadmapNodeCard
              key={node._id}
              title={node.title}
              description={node.description}
              status={node.progressStatus}
              stars={node.stars}
              itemCount={node.items.length}
              completedItems={completedItems}
              position={node.position}
              onPress={() => handleNodePress(node)}
            />
          );
        })}
      </View>

      {panel}
    </View>
  );
}

const styles = StyleSheet.create({
  circleWrapper: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    alignItems: 'center',
  },
  cardList: {
    gap: spacing.sm,
  },
});
