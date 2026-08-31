import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import type { BlocoPref } from "@/lib/generator-prefs.functions";
import type { Methodology } from "@/lib/methodology";
import { SortableBloco } from "./SortableBloco";

export function novoBloco(): BlocoPref {
  return {
    formato: "bodybuilding_sets",
    presetId: "builtin:bodybuilding_sets",
    titulo: "Novo bloco",
    duracao_min: null,
    num_exercicios: 3,
    series: 3,
    seriesMin: 3,
    seriesMax: 3,
    reps_base: 10,
    repsPorExercicio: 10,
    reps_pattern: [],
    progressao: "nenhuma",
    passos: [],
    tempo_trabalho: null,
    tempo_descanso: null,
    descansoAposSeg: 60,
    modoExecucao: "circuito",
    selecaoExercicios: "ia",
    exerciciosFixos: [],
    fonteExercicios: {},
    modalidades_alvo: [],
    equipamentos_alvo: [],
    exercicios_permitidos: [],
  };
}

export function MethodologyPanel({
  state,
  onUpdate,
  sensors,
  onDragEnd,
}: {
  state: { blocos: BlocoPref[]; loading: boolean; origem?: string };
  onUpdate: (fn: (blocos: BlocoPref[]) => BlocoPref[]) => void;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
}) {
  if (state.loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando preferências…
      </div>
    );
  }

  const ids = state.blocos.map((_, i) => `bloco-${i}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={state.origem === "custom" ? "default" : "secondary"} className="gap-1">
            <Sparkles className="h-3 w-3" />
            {state.origem === "custom" ? "Preferências personalizadas" : "Usando templates padrão"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {state.blocos.length} {state.blocos.length === 1 ? "bloco" : "blocos"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate((b) => [...b, novoBloco()])}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Adicionar bloco
        </Button>
      </div>

      {state.blocos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum bloco configurado</p>
            <p className="mt-1 text-xs text-muted-foreground">Adicione blocos para personalizar essa modalidade.</p>
          </div>
          <Button size="sm" onClick={() => onUpdate((b) => [...b, novoBloco()])} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar bloco
          </Button>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {state.blocos.map((bloco, i) => (
                <SortableBloco
                  key={`bloco-${i}`}
                  id={`bloco-${i}`}
                  index={i}
                  bloco={bloco}
                  onChange={(next) => onUpdate((b) => b.map((x, j) => (j === i ? next : x)))}
                  onRemove={() => onUpdate((b) => b.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
