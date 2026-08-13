import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Sparkles, Loader2, Save, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarLayout,
  salvarLayout,
  salvarTemplateModalidade,
  type PosicaoBloco,
  type ZonaBloco,
} from "@/lib/program-image-layout";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

type BlocoPosicionavel = {
  chave: string;
  titulo: string;
  formatoLabel: string;
};

const FORMATO_LABEL_FALLBACK: Record<string, string> = {
  preparacao_movimento: "Preparação de Movimento",
  forca_tecnica_pct: "Força/Técnica (%1RM)",
  emom: "EMOM",
  e2mom: "E2MOM",
  amrap: "AMRAP",
  circuito: "Circuito",
  kb_timed_sets: "Kettlebell Sport (AQ/TR)",
  metcon: "MetCon",
  bodybuilding_sets: "Séries × Reps",
  finalizador: "Finalizador",
  livre: "Bloco livre",
};

async function buscarBlocosDaPrimeiraSessao(programaId: string): Promise<BlocoPosicionavel[]> {
  const { data: semana, error: semanaErr } = await supabase
    .from("program_weeks")
    .select("id, sessions(id, numero_dia)")
    .eq("program_id", programaId)
    .order("numero_semana", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (semanaErr) throw new Error(semanaErr.message);

  const primeiraSessao = (semana as any)?.sessions
    ?.slice()
    .sort((a: any, b: any) => (a.numero_dia ?? 0) - (b.numero_dia ?? 0))?.[0];
  if (!primeiraSessao) return [];

  const { data: blocks, error: blocksErr } = await supabase
    .from("session_blocks")
    .select("ordem, formato, titulo, config")
    .eq("session_id", primeiraSessao.id)
    .order("ordem");
  if (blocksErr) throw new Error(blocksErr.message);

  return (blocks ?? [])
    // Permite blocos sem chave usando o índice/titulo como fallback seguro
    .map((b: any, index: number) => ({
      chave: b.config?.chave || `manual-${b.formato}-${index}`,
      titulo: b.titulo || FORMATO_LABEL_FALLBACK[b.formato] || b.formato,
      formatoLabel: FORMATO_LABEL_FALLBACK[b.formato] ?? b.formato,
    }));
}

function SortableItem({ id, bloco }: { id: string; bloco: BlocoPosicionavel }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-md border bg-card p-3 shadow-sm transition-shadow hover:border-primary/50",
        isDragging && "z-50 opacity-50 shadow-xl border-primary"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-primary transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold uppercase">{bloco.titulo}</p>
        <p className="text-[10px] text-muted-foreground">{bloco.formatoLabel}</p>
      </div>
    </div>
  );
}

export interface PosicionarBlocosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programaId: string;
  modalidade: string;
  onFinish: () => void;
}

export function PosicionarBlocosDialog({
  open,
  onOpenChange,
  programaId,
  modalidade,
  onFinish,
}: PosicionarBlocosDialogProps) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [todosBlocos, setTodosBlocos] = useState<BlocoPosicionavel[]>([]);
  const [esquerda, setEsquerda] = useState<string[]>([]);
  const [principal, setPrincipal] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setCarregando(true);
    (async () => {
      try {
        const blocos = await buscarBlocosDaPrimeiraSessao(programaId);
        if (cancelado) return;
        setTodosBlocos(blocos);

        const { layout } = carregarLayout(programaId, modalidade);
        const posicoesSalvas = layout.posicoesBlocos ?? [];

        if (posicoesSalvas.length > 0) {
          const chavesValidas = new Set(blocos.map((b) => b.chave));
          const porZona = (zona: ZonaBloco) =>
            posicoesSalvas
              .filter((p) => p.zona === zona && chavesValidas.has(p.chave))
              .sort((a, b) => a.ordem - b.ordem)
              .map((p) => p.chave);
          
          setEsquerda(porZona("esquerda"));
          setPrincipal(porZona("principal"));

          // Se houver blocos que não estão em nenhuma zona (novos no molde), coloca no principal
          const chavesPosicionadas = new Set(posicoesSalvas.map(p => p.chave));
          const novos = blocos.filter(b => !chavesPosicionadas.has(b.chave)).map(b => b.chave);
          if (novos.length > 0) {
            setPrincipal(prev => [...prev, ...novos]);
          }
        } else {
          const esq = blocos.filter((b) =>
            /preparação|aquecimento/i.test(b.titulo) || b.formatoLabel === "Preparação de Movimento",
          );
          const princ = blocos.filter((b) => !esq.includes(b));
          setEsquerda(esq.map((b) => b.chave));
          setPrincipal(princ.map((b) => b.chave));
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao carregar os blocos da sessão");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open, programaId, modalidade]);

  const mapaBlocos = useMemo(
    () => new Map(todosBlocos.map((b) => [b.chave, b])),
    [todosBlocos],
  );

  function handleDragStart(event: any) {
    setActiveId(event.active.id);
  }

  function handleDragOver(event: any) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = active.data.current?.sortable.containerId;
    const overContainer = over.data.current?.sortable.containerId || over.id;

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    if (activeContainer === "esquerda" && overContainer === "principal") {
      setEsquerda((prev) => prev.filter((id) => id !== active.id));
      setPrincipal((prev) => {
        const overIndex = over.id === "principal" ? prev.length : prev.indexOf(over.id);
        return [...prev.slice(0, overIndex), active.id, ...prev.slice(overIndex)];
      });
    } else if (activeContainer === "principal" && overContainer === "esquerda") {
      setPrincipal((prev) => prev.filter((id) => id !== active.id));
      setEsquerda((prev) => {
        const overIndex = over.id === "esquerda" ? prev.length : prev.indexOf(over.id);
        return [...prev.slice(0, overIndex), active.id, ...prev.slice(overIndex)];
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = active.data.current?.sortable.containerId;
    const overContainer = over.data.current?.sortable.containerId || over.id;

    if (activeContainer === overContainer) {
      const setFn = activeContainer === "esquerda" ? setEsquerda : setPrincipal;
      setFn((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  }

  async function salvar(comoPadraoModalidade: boolean) {
    setSalvando(true);
    try {
      const posicoes: PosicaoBloco[] = [
        ...esquerda.map((chave, i) => ({ chave, zona: "esquerda" as const, ordem: i })),
        ...principal.map((chave, i) => ({ chave, zona: "principal" as const, ordem: i })),
      ];

      const { layout } = carregarLayout(programaId, modalidade);
      const proximo = { ...layout, posicoesBlocos: posicoes };
      salvarLayout(programaId, proximo);
      if (comoPadraoModalidade) {
        salvarTemplateModalidade(modalidade, proximo);
        toast.success("Posição salva como padrão para futuras gerações.");
      } else {
        toast.success("Posição salva para este programa.");
      }
      onOpenChange(false);
      onFinish();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar a posição");
    } finally {
      setSalvando(false);
    }
  }

  const activeBloco = activeId ? mapaBlocos.get(activeId) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="h-4 w-4" />
            </div>
            Organizar Layout da Imagem
          </DialogTitle>
          <DialogDescription>
            Arraste os blocos entre as colunas para organizar a imagem final.
            A faixa esquerda geralmente contém Mobilidade e Aquecimento.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-6">
          {carregando ? (
            <div className="flex h-60 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando estrutura...
            </div>
          ) : todosBlocos.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Nenhum bloco detectado.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-2 gap-8 relative min-h-[400px]">
                {/* Linhas-guia visuais no editor */}
                <div className="absolute inset-0 grid grid-cols-2 pointer-events-none opacity-[0.03]">
                   <div className="border-r border-foreground h-full" />
                   <div className="h-full" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Faixa Esquerda</span>
                    <span className="text-[10px] bg-muted px-1.5 rounded text-muted-foreground">{esquerda.length}</span>
                  </div>
                  
                  <div id="esquerda" className="space-y-3 min-h-[300px] rounded-lg border border-dashed border-border/60 p-3 bg-background/50 transition-colors">
                    <SortableContext id="esquerda" items={esquerda} strategy={verticalListSortingStrategy}>
                      {esquerda.map((id) => (
                        <SortableItem key={id} id={id} bloco={mapaBlocos.get(id)!} />
                      ))}
                    </SortableContext>
                    {esquerda.length === 0 && (
                      <div className="flex h-20 items-center justify-center text-[11px] text-muted-foreground/40 italic">
                        Vazio
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Faixa Principal</span>
                    <span className="text-[10px] bg-muted px-1.5 rounded text-muted-foreground">{principal.length}</span>
                  </div>

                  <div id="principal" className="space-y-3 min-h-[300px] rounded-lg border border-dashed border-border/60 p-3 bg-background/50 transition-colors">
                    <SortableContext id="principal" items={principal} strategy={verticalListSortingStrategy}>
                      {principal.map((id) => (
                        <SortableItem key={id} id={id} bloco={mapaBlocos.get(id)!} />
                      ))}
                    </SortableContext>
                    {principal.length === 0 && (
                      <div className="flex h-20 items-center justify-center text-[11px] text-muted-foreground/40 italic">
                        Vazio
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.5',
                    },
                  },
                }),
              }}>
                {activeId && activeBloco ? (
                  <div className="flex w-[350px] items-center gap-2 rounded-md border bg-card p-3 shadow-2xl border-primary ring-2 ring-primary/20">
                    <GripVertical className="h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold uppercase">{activeBloco.titulo}</p>
                      <p className="text-[10px] text-muted-foreground">{activeBloco.formatoLabel}</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        <DialogFooter className="gap-3 border-t bg-muted/10 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="mr-auto">
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => salvar(true)}
            disabled={salvando || todosBlocos.length === 0}
            className="gap-2"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar como padrão
          </Button>
          <Button
            onClick={() => salvar(false)}
            disabled={salvando || todosBlocos.length === 0}
            className="gap-2 px-6"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PosicionarBlocosDialog;