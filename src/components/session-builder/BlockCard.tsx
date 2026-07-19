import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useBuilder,
  type BuilderBlock,
} from "@/lib/session-builder-store";
import { BLOCK_FORMAT_LABEL } from "@/lib/methodology";
import {
  PrepMovimentoForm,
  TimedForm,
  ForcaPctForm,
  KbTimedForm,
} from "./BlockFormats";

export function BlockCard({ block }: { block: BuilderBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.tempId });
  const update = useBuilder((s) => s.updateBlock);
  const remove = useBuilder((s) => s.removeBlock);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-4">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge>{BLOCK_FORMAT_LABEL[block.formato]}</Badge>
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
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Este formato de bloco ainda não tem editor visual — será adicionado nas
          próximas entregas.
        </p>
      );
  }
}