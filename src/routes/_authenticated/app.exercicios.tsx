import { createFileRoute, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  GitMerge,
  Dumbbell,
  Loader2,
  CheckSquare,
  Wand2,
  X,
  ChevronDown,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  METHODOLOGY_LABEL,
  type Methodology,
} from "@/lib/methodology";
import { useCoach } from "@/hooks/use-coach";
import {
  ExerciseEditorDialog,
  EQUIPAMENTOS,
  type Equipamento,
} from "@/components/exercises/ExerciseEditorDialog";
import { BulkEditDialog } from "@/components/exercises/BulkEditDialog";

export const Route = createFileRoute("/_authenticated/app/exercicios")({
  component: ExerciciosPage,
});

const METHODS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

function ExerciciosPage() {
  const { data: coach } = useCoach();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  const [metFilter, setMetFilter] = useState<Methodology | "todos">("todos");
  const [equipFilter, setEquipFilter] = useState<Equipamento | "todos">("todos");
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const qc = useQueryClient();

  const { data: exercises = [], isPending, isFetching } = useQuery({
    queryKey: ["exercises", debouncedQ, metFilter, equipFilter, untaggedOnly],
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("*, exercise_media(*)")
        .order("nome_pt");
      if (debouncedQ.trim()) query = query.ilike("nome_pt", `%${debouncedQ.trim()}%`);
      if (metFilter !== "todos") query = query.contains("metodologias", [metFilter]);
      if (equipFilter !== "todos") query = query.contains("equipamento", [equipFilter]);
      if (untaggedOnly) {
        query = query
          .filter("metodologias", "eq", "{}")
          .filter("equipamento", "eq", "{}");
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: tagStats } = useQuery({
    queryKey: ["exercises", "tag-stats"],
    queryFn: async () => {
      const total = await supabase
        .from("exercises")
        .select("id", { count: "exact", head: true });
      const untagged = await supabase
        .from("exercises")
        .select("id", { count: "exact", head: true })
        .filter("metodologias", "eq", "{}")
        .filter("equipamento", "eq", "{}");
      return {
        total: total.count ?? 0,
        untagged: untagged.count ?? 0,
      };
    },
  });

  const equipCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ex of exercises as any[]) {
      const arr: string[] = ex.equipamento ?? [];
      for (const e of arr) map.set(e, (map.get(e) ?? 0) + 1);
    }
    return map;
  }, [exercises]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exercício removido definitivamente");
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["exercises", "tag-stats"] });
    },
    onError: (e: any) => {
      console.error("Erro ao deletar exercício:", e);
      toast.error(e.message || "Erro ao remover exercício.");
    },
  });

  const visibleIds = useMemo(
    () => (exercises as any[]).map((ex) => ex.id as string),
    [exercises]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }
  async function selectAllInDatabase(opts: { onlyMine?: boolean } = {}) {
    setSelectingAll(true);
    try {
      let query = supabase.from("exercises").select("id,coach_id");
      if (opts.onlyMine && coach?.id) query = query.eq("coach_id", coach.id);
      const { data, error } = await query;
      if (error) throw error;
      const ids = (data ?? []).map((r: any) => r.id as string);
      setSelected(new Set(ids));
      toast.success(
        opts.onlyMine
          ? `${ids.length} exercícios seus selecionados`
          : `${ids.length} exercícios selecionados`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao selecionar");
    } finally {
      setSelectingAll(false);
    }
  }
  function clearSelection() {
    setSelected(new Set());
  }
  function exitSelectionMode() {
    setSelectionMode(false);
    clearSelection();
  }

  const location = useLocation();
  const isDuplicados = location.pathname.includes("/duplicados");

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Banco de Exercícios</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Acesso completo ao banco de dados pessoal de exercícios. Gerencie, edite e organize todos os movimentos utilizados na prescrição de treinos de forma independente.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            variant={selectionMode ? "secondary" : "ghost"}
            onClick={() => {
              if (selectionMode) exitSelectionMode();
              else setSelectionMode(true);
            }}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            {selectionMode ? "Cancelar seleção" : "Selecionar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigate({ to: "/app/exercicios/duplicados" as any });
            }}
            className="gap-2"
          >
            <GitMerge className="h-4 w-4" />
            Limpar duplicados
          </Button>

          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo exercício
          </Button>
        </div>
      </div>

      {isDuplicados ? <Outlet /> : (
        <>
          {tagStats && tagStats.total > 0 && (
            <TagCoverage
              total={tagStats.total}
              untagged={tagStats.untagged}
              active={untaggedOnly}
              onToggle={() => setUntaggedOnly((v) => !v)}
            />
          )}

          <div className="mb-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={metFilter} onValueChange={(v) => setMetFilter(v as any)}>
              <SelectTrigger className="sm:w-64">
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

          <div
            role="group"
            aria-label="Filtrar por equipamento"
            className="mb-6 -mx-2 flex flex-nowrap gap-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            <EquipChip
              label="Todos"
              count={tagStats?.total}
              active={equipFilter === "todos"}
              onClick={() => setEquipFilter("todos")}
            />
            {EQUIPAMENTOS.map((e) => (
              <EquipChip
                key={e}
                label={e}
                count={equipCounts.get(e)}
                active={equipFilter === e}
                onClick={() => setEquipFilter(equipFilter === e ? "todos" : e)}
              />
            ))}
          </div>

          {isPending ? (
            <div className="grid gap-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Card key={n} className="flex items-center justify-between p-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16" />
                </Card>
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Dumbbell className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold">Nenhum exercício encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                {q || metFilter !== "todos" || equipFilter !== "todos" || untaggedOnly
                  ? "Nenhum exercício corresponde aos filtros ativos. Tente limpar os filtros ou cadastrar um novo movimento."
                  : "Seu catálogo está vazio. Cadastre seu primeiro exercício para começar a prescrever treinos."}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {(q || metFilter !== "todos" || equipFilter !== "todos" || untaggedOnly) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQ("");
                      setMetFilter("todos");
                      setEquipFilter("todos");
                      setUntaggedOnly(false);
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Cadastrar primeiro exercício
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              {selectionMode && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm shadow-sm">
                  <span className="mr-1 font-medium text-foreground">
                    {selected.size} selecionado{selected.size === 1 ? "" : "s"}
                  </span>
                  <div className="inline-flex overflow-hidden rounded-md border border-border/70 bg-background shadow-sm">
                    <button
                      type="button"
                      disabled={selectingAll}
                      onClick={allVisibleSelected ? clearSelection : selectAllVisible}
                      className="inline-flex h-8 items-center gap-1.5 px-3 text-sm font-medium text-foreground outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selectingAll ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : allVisibleSelected ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                      {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={selectingAll}
                          aria-label="Mais opções de seleção"
                          className="inline-flex h-8 items-center border-l border-border/70 px-2 text-foreground outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                          Escopo de seleção
                        </DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => selectAllInDatabase()}>
                          <CheckSquare className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>Todo o banco de dados</span>
                            <span className="text-xs text-muted-foreground">
                              Ignora filtros e busca atual
                            </span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => selectAllInDatabase({ onlyMine: true })}
                        >
                          <Dumbbell className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>Somente meus exercícios</span>
                            <span className="text-xs text-muted-foreground">
                              Exclui exercícios compartilhados
                            </span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={clearSelection}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Limpar seleção</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
              <div className={"grid gap-3 " + (selectionMode && selected.size > 0 ? "pb-28 sm:pb-24" : "")}>
                {exercises.map((ex: any) => {
                  const isSel = selected.has(ex.id);
                  const clickable = selectionMode;
                  return (
                    <Card
                      key={ex.id}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? () => toggleSelected(ex.id) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                toggleSelected(ex.id);
                              }
                            }
                          : undefined
                      }
                      className={
                        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 transition-all duration-200 sm:flex sm:justify-between " +
                        (clickable ? "cursor-pointer " : "") +
                        (isSel
                          ? "border-primary/60 bg-primary/[0.04] ring-1 ring-primary/20"
                          : "hover:border-primary/30")
                      }
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {selectionMode && (
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggleSelected(ex.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 shrink-0"
                            aria-label={`Selecionar ${ex.nome_pt}`}
                          />
                        )}
                        <div className="min-w-0">
                          {selectionMode ? (
                            <span className="block truncate font-semibold text-foreground">
                              {ex.nome_pt}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(ex);
                                setOpen(true);
                              }}
                              className="rounded-sm text-left font-semibold text-foreground outline-none transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              {ex.nome_pt}
                            </button>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(ex.equipamento ?? []).map((eq: string) => (
                              <Badge
                                key={eq}
                                className="border-transparent bg-primary/10 text-primary text-xs hover:bg-primary/15"
                              >
                                {eq}
                              </Badge>
                            ))}
                            {(ex.metodologias ?? []).map((m: Methodology) => (
                              <Badge key={m} variant="secondary" className="text-xs">
                                {METHODOLOGY_LABEL[m]}
                              </Badge>
                            ))}
                            {ex.padrao_movimento && (
                              <Badge variant="outline" className="text-xs">
                                {ex.padrao_movimento}
                              </Badge>
                            )}
                            {ex.unilateral && (
                              <Badge variant="outline" className="text-xs">
                                unilateral
                              </Badge>
                            )}
                            {(ex.equipamento ?? []).length === 0 &&
                              (ex.metodologias ?? []).length === 0 && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-dashed border-warning/40 bg-warning/5 text-[10.5px] font-medium uppercase tracking-wide text-warning-foreground/80"
                                >
                                  <Tag className="h-3 w-3" />
                                  sem tags
                                </Badge>
                              )}
                          </div>
                        </div>
                      </div>
                      {!selectionMode && (
                        <div className="flex shrink-0 gap-2 justify-self-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(ex);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={del.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remover "${ex.nome_pt}"?`)) del.mutate(ex.id);
                            }}
                          >
                            {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          <ExerciseEditorDialog
            open={open}
            onOpenChange={setOpen}
            editing={editing}
            coachId={coach?.id}
            existingExercises={exercises as any[]}
            onOpenExisting={(ex) => {
              setEditing(ex);
              setOpen(true);
            }}
          />

          {selectionMode && selected.size > 0 && (
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
              <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selected.size} exercício{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    Ajuste modalidades e equipamento em lote.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="hidden sm:inline-flex"
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkOpen(true)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Editar em massa
                </Button>
              </div>
            </div>
          )}

          <BulkEditDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            selectedIds={Array.from(selected)}
            exercises={exercises as any[]}
            coachId={coach?.id}
            onApplied={() => {
              setBulkOpen(false);
              clearSelection();
              qc.invalidateQueries({ queryKey: ["exercises"] });
            }}
          />
        </>
      )}
    </div>
  );
}

function EquipChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {label}
      {typeof count === "number" && (
        <span
          className={
            "rounded-full px-1.5 py-0.5 text-[10px] leading-none " +
            (active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

function TagCoverage({
  total,
  untagged,
  active,
  onToggle,
}: {
  total: number;
  untagged: number;
  active: boolean;
  onToggle: () => void;
}) {
  const tagged = Math.max(0, total - untagged);
  const pct = total > 0 ? Math.round((tagged / total) * 100) : 100;
  const allDone = untagged === 0;
  return (
    <div
      className={
        "mb-4 flex flex-col gap-3 rounded-xl border px-4 py-3 transition-colors duration-200 sm:flex-row sm:items-center sm:justify-between " +
        (active
          ? "border-warning/50 bg-warning/[0.06]"
          : allDone
            ? "border-border/60 bg-muted/30"
            : "border-border bg-card")
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors duration-200 " +
            (allDone
              ? "bg-primary/10 text-primary"
              : "bg-warning/15 text-warning-foreground")
          }
          aria-hidden="true"
        >
          <Tag className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {allDone
              ? "Todos os exercícios classificados"
              : `${untagged} de ${total} exercícios sem classificação`}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {allDone
              ? "Modalidade e equipamento definidos em todo o banco."
              : `${pct}% já com modalidade ou equipamento. Selecione em lote para atribuir.`}
          </p>
        </div>
      </div>
      {!allDone && (
        <Button
          type="button"
          size="sm"
          variant={active ? "secondary" : "outline"}
          onClick={onToggle}
          className="shrink-0 gap-2 transition-all duration-200"
        >
          <Search className="h-3.5 w-3.5" />
          {active ? "Mostrar todos" : "Filtrar não classificados"}
        </Button>
      )}
    </div>
  );
}
