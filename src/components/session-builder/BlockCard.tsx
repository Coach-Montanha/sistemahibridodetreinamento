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
import { useFormatRegistry } from "@/lib/format-registry";
import {
  PrepMovimentoForm,
  TimedForm,
  ForcaPctForm,
  KbTimedForm,
  SetsRepsForm,
  SeriesTempoForm,
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
  const { presets } = useFormatRegistry();

  const preset = presets.find(
    (p) => p.id === block.formato || p.id === `builtin:${block.formato}` || p.base === block.formato
  );
  const formatLabel =
    preset?.label ??
    BLOCK_FORMAT_LABEL[block.formato] ??
    (block.formato.startsWith("custom:") ? "Personalizado" : block.formato);

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
        "p-3 sm:p-4 transition-[border-color,box-shadow] duration-200",
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
          className={cn(dragHandleClass, "mt-1 sm:mt-0.5")}
          aria-label={`Reordenar bloco ${block.titulo ?? ""}`.trim()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <Badge className="shrink-0 max-w-[220px] truncate text-xs font-semibold uppercase tracking-wider py-1 px-2.5">
                {formatLabel}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(block.tempId)}
                aria-label="Remover bloco"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 sm:hidden cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                placeholder="Título do bloco (opcional)"
                className="h-9 flex-1 text-sm bg-background/80"
                value={block.titulo ?? ""}
                onChange={(e) => update(block.tempId, { titulo: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(block.tempId)}
                aria-label="Remover bloco"
                className="hidden sm:inline-flex h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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
  const { presets } = useFormatRegistry();
  const format = block.formato;
  const prefixed = format.startsWith("custom:") || format.startsWith("builtin:");
  const base = prefixed
    ? (presets.find(p => p.id === format)?.base ?? format.split(":")[1] ?? format)
    : format;

  switch (base) {
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
    case "series_tempo":
      return <SeriesTempoForm block={block} />;
    case "bodybuilding_sets":
    case "circuito":
    case "metcon":
    case "finalizador":
      return <SetsRepsForm block={block} />;
    case "livre":
      return <LivreForm block={block} />;
    default:
      // Fallback para suportar todos os formatos dinâmicos/builtin com o editor de SetsRepsForm
      // Isso resolve o problema de visualização dos exercícios enquanto editores específicos não existem.
      return <SetsRepsForm block={block} />;
  }
}