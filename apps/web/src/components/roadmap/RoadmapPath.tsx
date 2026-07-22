// Renders the full roadmap — winding circles for children, card list for adults.
import { useRef, useState, useEffect } from 'react';
import type { RoadmapWithProgress, AgeGroup, NodeItemWithProgress } from '@my-backpack/shared';
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

// Coerce RoadmapWithProgress node to the panel-compatible shape
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedNode, setSelectedNode] = useState<NodeForPanel | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, []);

  const nodes = roadmap.nodes;

  const handleNodeClick = (node: RoadmapWithProgress['nodes'][number]) => {
    if (!node.isUnlocked) return;
    setSelectedNode(toNodeForPanel(node));
  };

  if (ageGroup === 'child') {
    const svgHeight = nodes.length * NODE_SPACING + NODE_RADIUS * 2;
    const pathD = buildWindingPath(nodes.length, containerWidth);

    return (
      <div ref={containerRef} className="relative w-full">
        {/* SVG winding path */}
        {containerWidth > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={containerWidth}
            height={svgHeight}
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <path
              d={pathD}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="8 6"
              opacity="0.6"
            />
          </svg>
        )}

        {/* Nodes */}
        <div style={{ height: svgHeight }} className="relative">
          {nodes.map((node, i) => {
            const x = i % 2 === 0 ? containerWidth * 0.3 : containerWidth * 0.7;
            const y = i * NODE_SPACING + NODE_RADIUS;
            return (
              <div
                key={node._id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
              >
                <RoadmapNodeCircle
                  title={node.title}
                  status={node.progressStatus}
                  stars={node.stars}
                  onClick={() => handleNodeClick(node)}
                />
              </div>
            );
          })}
        </div>

        {selectedNode && (
          <NodeLessonsPanel
            node={selectedNode}
            subjectSlug={subjectSlug}
            courseSlug={courseSlug}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    );
  }

  // Adult / teen: card list
  return (
    <div ref={containerRef} className="relative">
      {/* Thin vertical progress line */}
      <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-white/40 rounded-full" />

      <div className="space-y-3 relative">
        {nodes.map((node) => {
          const completedItems = toNodeForPanel(node).items.filter(
            (i) => i.progressStatus === 'completed'
          ).length;

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
              onClick={() => handleNodeClick(node)}
            />
          );
        })}
      </div>

      {selectedNode && (
        <NodeLessonsPanel
          node={selectedNode}
          subjectSlug={subjectSlug}
          courseSlug={courseSlug}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
