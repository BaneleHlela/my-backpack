// Generic drag-to-reorder list built on @dnd-kit (already a dependency — used by
// DndSinglePattern for the learner-facing DnD quiz renderer). Reused for the course's node
// list, a node's items list, a quiz's question list, and a lesson's resources list — each
// needs the same "drag a handle, reorder, fire a callback with the new order" behavior.
// A dedicated drag handle (not the whole row) keeps buttons/links inside each row clickable.
import type { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DragHandleProps {
  [key: string]: unknown;
}

interface SortableItemProps {
  id: string;
  children: (props: { dragHandleProps: DragHandleProps; isDragging: boolean }) => ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
}

export function DragHandle({ dragHandleProps }: { dragHandleProps: DragHandleProps }) {
  return (
    <span
      {...dragHandleProps}
      className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
    >
      <GripVertical className="w-4 h-4" />
    </span>
  );
}

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T, index: number, drag: { dragHandleProps: DragHandleProps }) => ReactNode;
}

export default function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <SortableItem key={item.id} id={item.id}>
              {({ dragHandleProps }) => renderItem(item, idx, { dragHandleProps })}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
