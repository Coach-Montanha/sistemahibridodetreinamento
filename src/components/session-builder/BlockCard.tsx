import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dragHandleClass } from "@/components/dnd/sortable-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useBuilder,
  type BuilderBlock,
} from "@/lib/session-builder-store";
import { BLOCK_FORMAT_LABEL, useFormatLabel } from "@/lib/methodology";
import {
  PrepMovimentoForm,
  TimedForm,
  ForcaPctForm,
  KbTimedForm,
  SetsRepsForm,
  LivreForm,
} from "./BlockFormats";

export function BlockCard({ block }: { block: BuilderBlock }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: block.tempId });
  const update = useBuilder((s) => s.updateBlock);
  const remove = useBuilder((s) => s.removeBlock);

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
    ),
    transition: transition ?? "transform 200ms cubic-bezier(0.2,0,0,1)",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 transition-[border-color,box-shadow] duration-200",
        isDragging
          ? "z-20 scale-[1.01] border-primary/60 shadow-xl shadow-primary/10"
          : "border-border/70 hover:border-primary/40",
        isOver && !isDragging && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={cn(dragHandleClass, "mt-0.5")}
          aria-label={`Reordenar bloco ${block.titulo ?? ""}`.trim()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge>{useFormatLabel(block.formato)}</Badge>
            <Input
              placeholder="Título do bloco (opcional)"
              className="h-8 flex-1"
              value={block.titulo ?? ""}
              onChange={(e) => update(block.tempId, { titulo: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(block.tempId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4">
            <BlockBody block={block} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function BlockBody({ block }: { block: BuilderBlock }) {
  switch (block.formato) {
    case "mobilidade":
    case "preparacao_movimento":
      return <PrepMovimentoForm block={block} />;
    case "e2mom":
    case "emom":
    case "amrap":
      return <TimedForm block={block} />;
    case "forca_tecnica_pct":
      return <ForcaPctForm block={block} />;
    case "kb_timed_sets":
      return <KbTimedForm block={block} />;
    case "bodybuilding_sets":
    case "circuito":
    case "metcon":
    case "finalizador":
      return <SetsRepsForm block={block} />;
    case "livre":
      return <LivreForm block={block} />;
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Este formato de bloco ainda não tem editor visual — será adicionado nas
          próximas entregas.
        </p>
      );
  }
}