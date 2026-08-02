import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  ChevronRight,
  CalendarDays,
  Layers,
  FileText,
  Trash2,
  FolderKanban,
  X,
  ImageDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { useCoach } from "@/hooks/use-coach";
import { exportarSessoesPdfTabela } from "@/lib/pdf-treino";
import { exportarSessoesImagemA4 } from "@/lib/a4-image-export";
import { SortableList, SortableRow } from "@/components/dnd/sortable-list";
import {
  ProgramImageDialog,
  useNovidadesPendentes,
} from "@/components/program-image/ProgramImageDialog";
const PrescreverIaDialog = lazy(() =>
  import("@/components/programa-ia/PrescreverIaDialog").then((m) => ({
    default: m.PrescreverIaDialog,
  })),
);

export const Route = createFileRoute("/_authenticated/app/programas")({
  component: ProgramasPage,
});

const METHODS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

function ProgramasPage() {
  return <ProgramasPanel />;
}

export function ProgramasPanel({
  showHeader = true,
  destacarIa = false,
}: { showHeader?: boolean; destacarIa?: boolean } = {}) {
  const { data: coach } = useCoach();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [met, setMet] = useState<Methodology | "todos">(
    destacarIa ? "musculacao" : "todos",
  );
  const [toDelete, setToDelete] = useState<{ id: string; titulo: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkImg, setBulkImg] = useState<"png" | "jpg" | null>(null);
  const [bulkPdf, setBulkPdf] = useState(false);
  const [geradas, setGeradas] = useState<{ png?: number; jpg?: number }>({});
  const [bulkImgLoading, setBulkImgLoading] = useState(false);
  const [layoutPrograma, setLayoutPrograma] = useState<any | null>(null);
  const [iaPrograma, setIaPrograma] = useState<any | null>(null);

  const programasKey = ["programas", coach?.id] as const;

  const { data: programas = [], isLoading } = useQuery({
    queryKey: programasKey,
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, titulo, metodologia, data_inicio, duracao_semanas, status, criado_em, program_weeks(id, numero_semana, rotulo, sessions(id, numero_dia, titulo, status))",
        )
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return programas.filter((p: any) => {
      if (met !== "todos" && p.metodologia !== met) return false;
      if (!needle) return true;
      return String(p.titulo ?? "").toLowerCase().includes(needle);
    });
  }, [programas, q, met]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programa removido");
      qc.invalidateQueries({ queryKey: ["programas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  /** Reordena sessões dentro de uma semana gravando `numero_dia`. */
  async function reorderSessoes(programId: string, weekId: string, orderedIds: string[]) {
    const snapshot = qc.getQueryData(programasKey);
    qc.setQueryData(programasKey, (old: any) =>
      (old ?? []).map((p: any) =>
        p.id !== programId
          ? p
          : {
              ...p,
              program_weeks: (p.program_weeks ?? []).map((w: any) =>
                w.id !== weekId
                  ? w
                  : {
                      ...w,
                      sessions: orderedIds.map((id, i) => ({
                        ...(w.sessions ?? []).find((s: any) => s.id === id),
                        numero_dia: i + 1,
                      })),
                    },
              ),
            },
      ),
    );
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("sessions")
          .update({ numero_dia: i + 1 })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    } catch (e: any) {
      qc.setQueryData(programasKey, snapshot);
      toast.error(e?.message ?? "Não foi possível salvar a nova ordem dos dias");
    }
  }

  /** Reordena semanas gravando `numero_semana` (duas passadas por causa do unique). */
  async function reorderSemanas(programId: string, orderedIds: string[]) {
    const snapshot = qc.getQueryData(programasKey);
    qc.setQueryData(programasKey, (old: any) =>
      (old ?? []).map((p: any) =>
        p.id !== programId
          ? p
          : {
              ...p,
              program_weeks: orderedIds.map((id, i) => ({
                ...(p.program_weeks ?? []).find((w: any) => w.id === id),
                numero_semana: i + 1,
              })),
            },
      ),
    );
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("program_weeks")
          .update({ numero_semana: -(i + 1) })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("program_weeks")
          .update({ numero_semana: i + 1 })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    } catch (e: any) {
      qc.setQueryData(programasKey, snapshot);
      toast.error(e?.message ?? "Não foi possível salvar a nova ordem das semanas");
    }
  }

  const bulkDel = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("sessions").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} sessão(ões) removida(s)`);
      setSelected(new Set());
      setConfirmBulk(false);
      qc.invalidateQueries({ queryKey: ["programas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function toggle(id: string) {
    setGeradas({});
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleWeek(ids: string[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function exportarImagens(formato: "png" | "jpg") {
    if (selected.size === 0) return;
    setBulkImgLoading(true);
    setBulkImg(formato);
    try {
      const ids = Array.from(selected);
      const total = await exportarSessoesImagemA4(ids, formato, `treinos_${formato}.zip`);
      setGeradas((prev) => ({ ...prev, [formato]: total }));
      toast.success(`${total} imagem(ns) A4 exportada(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar imagens");
    } finally {
      setBulkImgLoading(false);
      setBulkImg(null);
    }
  }

  async function exportarPdfA4() {
    if (selected.size === 0) return;
    setBulkImgLoading(true);
    setBulkPdf(true);
    try {
      const ids = Array.from(selected);
      await exportarSessoesPdfTabela(ids, "treinos-a4.pdf");
      toast.success(`PDF A4 com ${ids.length} sessão(ões) gerado`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar PDF");
    } finally {
      setBulkImgLoading(false);
      setBulkPdf(false);
    }
  }

  return (
    <div className={showHeader ? "mx-auto max-w-6xl px-6 py-8" : "mx-auto max-w-6xl"}>
      {showHeader && (
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Programas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos os treinos gerados e criados por você, organizados por semana.
          </p>
        </div>
      </header>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={met} onValueChange={(v) => setMet(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as modalidades</SelectItem>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {METHODOLOGY_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              className="h-24 animate-pulse border-border/60 bg-muted/40"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-semibold">Nenhum programa ainda</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere seu primeiro programa em segundos.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 pb-24">
          {filtered.map((p: any) => {
            const semanas = (p.program_weeks ?? []).sort(
              (a: any, b: any) => a.numero_semana - b.numero_semana,
            );
            const totalSessoes = semanas.reduce(
              (acc: number, w: any) => acc + (w.sessions?.length ?? 0),
              0,
            );
            return (
              <ProgramaCard
                key={p.id}
                programa={p}
                semanas={semanas}
                totalSessoes={totalSessoes}
                selected={selected}
                onToggleSession={toggle}
                onToggleWeek={toggleWeek}
                onReorderSessoes={(weekId, ids) => reorderSessoes(p.id, weekId, ids)}
                onReorderSemanas={(ids) => reorderSemanas(p.id, ids)}
                onOpenLayout={() => setLayoutPrograma(p)}
                onOpenIa={() => setIaPrograma(p)}
                destacarIa={destacarIa}
                onDelete={() =>
                  setToDelete({ id: p.id, titulo: p.titulo ?? "programa" })
                }
              />
            );
          })}
        </div>
      )}

      <ProgramImageDialog
        programa={layoutPrograma}
        onOpenChange={(o) => !o && setLayoutPrograma(null)}
      />

      {iaPrograma && (
        <Suspense fallback={null}>
          <PrescreverIaDialog
            programa={iaPrograma}
            onOpenChange={(o) => !o && setIaPrograma(null)}
          />
        </Suspense>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir programa?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.titulo}" e todas as suas semanas e sessões serão removidas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) del.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} sessão(ões)?</AlertDialogTitle>
            <AlertDialogDescription>
              As sessões selecionadas e seus blocos/exercícios serão removidos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDel.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDel.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                bulkDel.mutate(Array.from(selected));
              }}
            >
              {bulkDel.isPending ? "Excluindo..." : "Excluir selecionadas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selected.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6 duration-200 animate-in slide-in-from-bottom-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
            <span className="text-sm font-medium">
              {selected.size} sessão(ões) selecionada(s)
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={bulkImgLoading}
              className="h-8 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportarImagens("png")}
              disabled={bulkImgLoading}
              className="h-8 gap-1.5"
            >
              {bulkImgLoading && bulkImg === "png" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageDown className="h-3.5 w-3.5" />
              )}
              PNG
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                {geradas.png ?? selected.size}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportarImagens("jpg")}
              disabled={bulkImgLoading}
              className="h-8 gap-1.5"
            >
              {bulkImgLoading && bulkImg === "jpg" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageDown className="h-3.5 w-3.5" />
              )}
              JPG
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                {geradas.jpg ?? selected.size}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportarPdfA4}
              disabled={bulkImgLoading}
              className="h-8 gap-1.5"
            >
              {bulkPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              PDF (A4)
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmBulk(true)}
              disabled={bulkImgLoading}
              className="h-8 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramaCard({
  programa,
  semanas,
  totalSessoes,
  selected,
  onToggleSession,
  onToggleWeek,
  onReorderSessoes,
  onReorderSemanas,
  onOpenLayout,
  onOpenIa,
  destacarIa,
  onDelete,
}: {
  programa: any;
  semanas: any[];
  totalSessoes: number;
  selected: Set<string>;
  onToggleSession: (id: string) => void;
  onToggleWeek: (ids: string[], allSelected: boolean) => void;
  onReorderSessoes: (weekId: string, orderedIds: string[]) => void;
  onReorderSemanas: (orderedIds: string[]) => void;
  onOpenLayout: () => void;
  onOpenIa: () => void;
  destacarIa?: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const temNovidades = useNovidadesPendentes();
  const data = programa.data_inicio
    ? new Date(programa.data_inicio).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <Card className="overflow-hidden border-border/70 transition-colors duration-200 hover:border-primary/40">
        <CollapsibleTrigger className="group flex w-full items-start gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold tracking-tight">
                {programa.titulo}
              </h3>
              <Badge
                variant={programa.status === "publicada" ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-wide"
              >
                {programa.status}
              </Badge>
              {programa.metodologia === "musculacao" && (
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/40 text-[10px] uppercase tracking-wide text-primary"
                >
                  <Sparkles className="h-3 w-3" />
                  IA
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {METHODOLOGY_LABEL[programa.metodologia as Methodology]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {data}
              </span>
              <span>
                {programa.duracao_semanas} sem · {totalSessoes} sessões
              </span>
            </div>
          </div>
          <ChevronRight
            className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 bg-muted/20 p-5">
            {semanas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem semanas neste programa.
              </p>
            ) : (
              <SortableList
                ids={semanas.map((w: any) => String(w.id))}
                label="Semana"
                onReorder={(activeId, overId) => {
                  const ids = semanas.map((w: any) => String(w.id));
                  const from = ids.indexOf(activeId);
                  const to = ids.indexOf(overId);
                  if (from < 0 || to < 0) return;
                  const next = [...ids];
                  next.splice(to, 0, next.splice(from, 1)[0]);
                  onReorderSemanas(next);
                }}
              >
              <div className="grid gap-4">
                {semanas.map((w: any) => {
                  const sessoes = (w.sessions ?? []).sort(
                    (a: any, b: any) => a.numero_dia - b.numero_dia,
                  );
                  const sessionIds = sessoes.map((s: any) => s.id);
                  const allSelected =
                    sessionIds.length > 0 &&
                    sessionIds.every((id: string) => selected.has(id));
                  return (
                    <SortableRow
                      key={w.id}
                      id={String(w.id)}
                      handleLabel={`Reordenar semana ${w.numero_semana}`}
                      className="flex-col items-stretch bg-card/60 p-3 pl-2"
                      contentClassName="flex-col items-stretch gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Semana {w.numero_semana}
                          {w.rotulo ? ` · ${w.rotulo}` : ""}
                        </div>
                        {sessionIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onToggleWeek(sessionIds, allSelected)}
                            className="shrink-0 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            {allSelected ? "desmarcar semana" : "selecionar semana"}
                          </button>
                        )}
                      </div>
                      {sessoes.length === 0 ? (
                        <p className="text-xs text-muted-foreground/80">
                          Sem sessões.
                        </p>
                      ) : (
                        <SortableList
                          ids={sessionIds.map(String)}
                          label="Dia"
                          onReorder={(activeId, overId) => {
                            const ids = sessionIds.map(String);
                            const from = ids.indexOf(activeId);
                            const to = ids.indexOf(overId);
                            if (from < 0 || to < 0) return;
                            const next = [...ids];
                            next.splice(to, 0, next.splice(from, 1)[0]);
                            onReorderSessoes(String(w.id), next);
                          }}
                        >
                        <div className="grid gap-2">
                          {sessoes.map((s: any) => {
                            const isSel = selected.has(s.id);
                            return (
                              <SortableRow
                                key={s.id}
                                id={String(s.id)}
                                handleLabel={`Reordenar dia ${s.numero_dia}`}
                                className={`group items-start rounded-lg border border-border/60 bg-card px-3 py-3 text-sm transition-colors hover:border-primary/40 ${
                                  isSel ? "border-primary/60 bg-primary/5" : ""
                                }`}
                                contentClassName="items-start gap-3"
                              >
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => onToggleSession(s.id)}
                                  className="mt-1 shrink-0"
                                  aria-label="Selecionar sessão"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="truncate text-base font-semibold tracking-tight">
                                      {s.titulo ?? `Treino ${s.numero_dia}`}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className="shrink-0 text-[10px] font-medium"
                                    >
                                      Dia {s.numero_dia}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {s.status === "publicada"
                                      ? "Publicada para o aluno"
                                      : "Ainda não executado"}
                                  </p>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="mt-3 h-8 gap-1.5"
                                  >
                                    <Link to="/app/sessoes/$id" params={{ id: s.id }}>
                                      <FileText className="h-3.5 w-3.5" />
                                      Ver exercícios
                                    </Link>
                                  </Button>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="mt-1 shrink-0 text-[10px] uppercase"
                                >
                                  {s.status}
                                </Badge>
                              </SortableRow>
                            );
                          })}
                        </div>
                        </SortableList>
                      )}
                    </SortableRow>
                  );
                })}
              </div>
              </SortableList>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="relative gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenLayout();
                }}
              >
                <ImageDown className="h-4 w-4" />
                Layout de imagem
                {temNovidades && (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
                  />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir programa
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}