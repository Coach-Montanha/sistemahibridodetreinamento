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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, ArrowLeftRight, Sparkles, Loader2 } from "lucide-react";
import { SortableList, SortableRow } from "@/components/dnd/sortable-list";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarLayout,
  salvarLayout,
  salvarTemplateModalidade,
  type PosicaoBloco,
  type ZonaBloco,
} from "@/lib/program-image-layout";

/**
 * Bloco de uma sessão (session_blocks) já com a chave do molde extraída de
 * config.chave — se ausente, o bloco não pertence ao motor de molde e não
 * pode ser reposicionado aqui (ex.: bloco adicionado manualmente depois).
 */
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
    .filter((b: any) => !!b.config?.chave)
    .map((b: any) => ({
      chave: b.config.chave as string,
      titulo: b.titulo || FORMATO_LABEL_FALLBACK[b.formato] || b.formato,
      formatoLabel: FORMATO_LABEL_FALLBACK[b.formato] ?? b.formato,
    }));
}

function BlocoChip({ bloco }: { bloco: BlocoPosicionavel }) {
  return (
    <div className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{bloco.titulo}</p>
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
  const [esquerda, setEsquerda] = useState<string[]>([]); // chaves, em ordem
  const [principal, setPrincipal] = useState<string[]>([]); // chaves, em ordem

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
        } else {
          // Sem posição salva ainda: replica a heurística automática atual
          // como ponto de partida (preparação/aquecimento → esquerda).
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

  function reordenarEsquerda(activeId: string, overId: string) {
    setEsquerda((prev) => mover(prev, activeId, overId));
  }
  function reordenarPrincipal(activeId: string, overId: string) {
    setPrincipal((prev) => mover(prev, activeId, overId));
  }
  function mover(lista: string[], activeId: string, overId: string): string[] {
    const from = lista.indexOf(activeId);
    const to = lista.indexOf(overId);
    if (from === -1 || to === -1 || from === to) return lista;
    const next = [...lista];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function moverParaZona(chave: string, destino: ZonaBloco) {
    if (destino === "esquerda") {
      setPrincipal((prev) => prev.filter((c) => c !== chave));
      setEsquerda((prev) => (prev.includes(chave) ? prev : [...prev, chave]));
    } else {
      setEsquerda((prev) => prev.filter((c) => c !== chave));
      setPrincipal((prev) => (prev.includes(chave) ? prev : [...prev, chave]));
    }
  }

  function montarPosicoes(): PosicaoBloco[] {
    return [
      ...esquerda.map((chave, i) => ({ chave, zona: "esquerda" as const, ordem: i })),
      ...principal.map((chave, i) => ({ chave, zona: "principal" as const, ordem: i })),
    ];
  }

  async function salvar(comoPadraoModalidade: boolean) {
    setSalvando(true);
    try {
      const { layout } = carregarLayout(programaId, modalidade);
      const proximo = { ...layout, posicoesBlocos: montarPosicoes() };
      salvarLayout(programaId, proximo);
      if (comoPadraoModalidade) {
        salvarTemplateModalidade(modalidade, proximo);
        toast.success("Posição salva para este programa e como padrão da modalidade");
      } else {
        toast.success("Posição dos blocos salva");
      }
      onOpenChange(false);
      onFinish();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar a posição");
    } finally {
      setSalvando(false);
    }
  }

  function pular() {
    onOpenChange(false);
    onFinish();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && pular()}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="h-4 w-4" />
            </div>
            Posicionar blocos na imagem
          </DialogTitle>
          <DialogDescription>
            Escolha em qual faixa cada bloco aparece na imagem exportada (Preparação/Aquecimento
            costumam ir na faixa esquerda) e a ordem dentro de cada faixa. Isso vale para todas as
            sessões geradas com este molde — a posição de cada exercício dentro do bloco continua
            automática.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {carregando ? (
            <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando blocos da sessão...
            </div>
          ) : todosBlocos.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted/50 text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium">
                Nenhum bloco com identificação de molde encontrado nesta sessão.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Isso é normal para programas gerados antes desta função — a exportação segue com o
                layout automático.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Faixa esquerda
                </div>
                {esquerda.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground/60">
                    Nenhum bloco aqui — arraste da faixa principal ou use o botão em cada bloco.
                  </div>
                ) : (
                  <SortableList ids={esquerda} onReorder={reordenarEsquerda} label="Bloco">
                    <div className="space-y-2">
                      {esquerda.map((chave) => {
                        const b = mapaBlocos.get(chave);
                        if (!b) return null;
                        return (
                          <SortableRow key={chave} id={chave} className="pr-2">
                            <BlocoChip bloco={b} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                              onClick={() => moverParaZona(chave, "principal")}
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </Button>
                          </SortableRow>
                        );
                      })}
                    </div>
                  </SortableList>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Faixa principal
                </div>
                {principal.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground/60">
                    Nenhum bloco aqui.
                  </div>
                ) : (
                  <SortableList ids={principal} onReorder={reordenarPrincipal} label="Bloco">
                    <div className="space-y-2">
                      {principal.map((chave) => {
                        const b = mapaBlocos.get(chave);
                        if (!b) return null;
                        return (
                          <SortableRow key={chave} id={chave} className="pr-2">
                            <BlocoChip bloco={b} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                              onClick={() => moverParaZona(chave, "esquerda")}
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </Button>
                          </SortableRow>
                        );
                      })}
                    </div>
                  </SortableList>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={pular} className="mr-auto sm:w-auto">
            Pular (usar layout automático)
          </Button>
          <Button
            variant="outline"
            onClick={() => salvar(true)}
            disabled={salvando || todosBlocos.length === 0}
            className="w-full gap-2 sm:w-auto"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar como padrão da modalidade
          </Button>
          <Button
            onClick={() => salvar(false)}
            disabled={salvando || todosBlocos.length === 0}
            className="w-full gap-2 sm:w-auto"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar só para este programa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PosicionarBlocosDialog;
