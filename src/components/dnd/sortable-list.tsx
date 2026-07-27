import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Classe única do handle de arraste — mesma personalidade em toda a app. */
export const dragHandleClass = cn(
  "inline-flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md",
  "text-muted-foreground transition-[color,background-color,box-shadow] duration-200",
  "hover:bg-accent hover:text-accent-foreground active:cursor-grabbing",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-40",
);

export function ptAnnouncements(label: string): Announcements {
  return {
    onDragStart: ({ active }) =>
      `${label} ${String(active.id)} agarrado. Use as setas para mover e Espaço para soltar.`,
    onDragOver: ({ over }) =>
      over ? `Movendo sobre a posição de ${String(over.id)}.` : "Fora de uma área válida.",
    onDragEnd: ({ over }) =>
      over ? `Solto na posição de ${String(over.id)}.` : "Movimento cancelado.",
    onDragCancel: () => "Movimento cancelado, posição original mantida.",
  };
}

export function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export function SortableList({
  ids,
  onReorder,
  label = "Item",
  axis = "vertical",
  children,
}: {
  ids: string[];
  onReorder: (activeId: string, overId: string) => void;
  label?: string;
  axis?: "vertical" | "grid";
  children: React.ReactNode;
}) {
  const sensors = useSortableSensors();

  function handleEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleEnd}
      accessibility={{ announcements: ptAnnouncements(label) }}
      modifiers={
        axis === "vertical" ? [restrictToVerticalAxis, restrictToParentElement] : undefined
      }
    >
      <SortableContext
        items={ids}
        strategy={axis === "vertical" ? verticalListSortingStrategy : rectSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Linha ordenável com handle dedicado (não briga com scroll no toque).
 * `children` recebe o estado de arraste para ajustes finos de estilo.
 */
export function SortableRow({
  id,
  className,
  contentClassName,
  handleLabel = "Reordenar",
  children,
  disabled,
}: {
  id: string;
  className?: string;
  contentClassName?: string;
  handleLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
        ),
        transition: transition ?? "transform 200ms cubic-bezier(0.2,0,0,1)",
      }}
      className={cn(
        "group/row relative flex items-center gap-2 rounded-lg border bg-card transition-[border-color,box-shadow,background-color] duration-200",
        isDragging
          ? "z-20 scale-[1.015] border-primary/60 shadow-lg shadow-primary/10"
          : "border-border/60 hover:border-primary/40",
        isOver && !isDragging && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
        className,
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={handleLabel}
        className={dragHandleClass}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className={cn("flex min-w-0 flex-1 items-center gap-2", contentClassName)}>
        {children}
      </div>
    </div>
  );
}