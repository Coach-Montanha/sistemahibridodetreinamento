import * as React from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export interface KanbanColumn {
  id: string;
  title: string;
  description?: string;
  color?: string;
}

export interface KanbanCardItem {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  tags?: string[];
  meta?: Record<string, any>;
}

export interface KanbanBoardProps<T extends KanbanCardItem = KanbanCardItem> {
  columns: KanbanColumn[];
  items: T[];
  onItemMove?: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  renderCard?: (item: T, isDragging?: boolean) => React.ReactNode;
  onCardClick?: (item: T) => void;
  className?: string;
}

export function KanbanBoard<T extends KanbanCardItem = KanbanCardItem>({
  columns,
  items,
  onItemMove,
  renderCard,
  onCardClick,
  className,
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = React.useState<T | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    if (item) {
      setActiveItem(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceItem = items.find((i) => i.id === activeId);
    if (!sourceItem) return;

    // Check if dropped onto a column or another card
    let destinationColumnId = overId;
    const overItem = items.find((i) => i.id === overId);
    if (overItem) {
      destinationColumnId = overItem.columnId;
    }

    if (sourceItem.columnId !== destinationColumnId) {
      onItemMove?.(activeId, sourceItem.columnId, destinationColumnId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "grid grid-flow-col auto-cols-[280px] sm:auto-cols-[320px] gap-4 overflow-x-auto pb-4 no-scrollbar items-start",
          className
        )}
      >
        {columns.map((col) => {
          const colItems = items.filter((item) => item.columnId === col.id);
          return (
            <KanbanColumnDroppable
              key={col.id}
              column={col}
              items={colItems}
              renderCard={renderCard}
              onCardClick={onCardClick}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="rotate-2 scale-105 opacity-90 transition-transform">
            {renderCard ? (
              renderCard(activeItem, true)
            ) : (
              <DefaultKanbanCard item={activeItem} isDragging />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnDroppableProps<T extends KanbanCardItem> {
  column: KanbanColumn;
  items: T[];
  renderCard?: (item: T, isDragging?: boolean) => React.ReactNode;
  onCardClick?: (item: T) => void;
}

function KanbanColumnDroppable<T extends KanbanCardItem>({
  column,
  items,
  renderCard,
  onCardClick,
}: KanbanColumnDroppableProps<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors min-h-[350px]",
        isOver && "border-primary/60 bg-primary/[0.04] ring-2 ring-primary/20"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {column.color && (
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", column.color)} />
          )}
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {column.title}
          </h3>
        </div>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
          {items.length}
        </Badge>
      </div>

      {/* Column Description */}
      {column.description && (
        <p className="text-[11px] text-muted-foreground mb-2.5">
          {column.description}
        </p>
      )}

      {/* Cards List */}
      <div className="flex-1 flex flex-col gap-2.5">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-border/50 rounded-lg text-center">
            <span className="text-xs text-muted-foreground/60">
              Nenhum item nesta etapa
            </span>
          </div>
        ) : (
          items.map((item) => (
            <KanbanDraggableCard
              key={item.id}
              item={item}
              renderCard={renderCard}
              onCardClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface KanbanDraggableCardProps<T extends KanbanCardItem> {
  item: T;
  renderCard?: (item: T, isDragging?: boolean) => React.ReactNode;
  onCardClick?: (item: T) => void;
}

function KanbanDraggableCard<T extends KanbanCardItem>({
  item,
  renderCard,
  onCardClick,
}: KanbanDraggableCardProps<T>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-20 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onCardClick?.(item)}
      className="cursor-grab active:cursor-grabbing focus:outline-none"
    >
      {renderCard ? renderCard(item, false) : <DefaultKanbanCard item={item} />}
    </div>
  );
}

function DefaultKanbanCard({
  item,
  isDragging,
}: {
  item: KanbanCardItem;
  isDragging?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-3 space-y-2 bg-card border-border/80 shadow-xs hover:border-border hover:shadow-sm transition-all duration-150",
        isDragging && "shadow-lg ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground line-clamp-2">
          {item.title}
        </h4>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 hover:text-foreground" />
      </div>

      {item.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {item.description}
        </p>
      )}

      {(item.badge || (item.tags && item.tags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.badge && (
            <Badge
              variant={item.badgeVariant || "outline"}
              className="text-[10px] px-1.5 py-0 h-4 font-medium"
            >
              {item.badge}
            </Badge>
          )}
          {item.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
