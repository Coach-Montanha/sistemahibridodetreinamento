import { createFileRoute, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  Loader2,
  Globe2,
  CheckSquare,
  Wand2,
  X,
  ChevronDown,
  Tag,
  Info,
  Copy,
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
import { ExerciseMediaUpload, type MediaItem } from "@/components/ExerciseMediaUpload";

export const Route = createFileRoute("/_authenticated/app/exercicios")({
  component: ExerciciosPage,
});

const METHODS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

const EQUIPAMENTOS = [
  "Kettlebell",
  "Ginásticos",
  "Mobilidade",
  "Barbell",
  "Dumbbell",
  "Alternativos Musculação",
  "Objetos Alternativos",
] as const;
type Equipamento = (typeof EQUIPAMENTOS)[number];

function ExerciciosPage() {
  const { data: coach } = useCoach();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

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

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises", q, metFilter, equipFilter, untaggedOnly],
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("*, exercise_media(*)")
        .order("nome_pt");
      if (q) query = query.ilike("nome_pt", `%${q}%`);
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
      // Remover referências primeiro se necessário (opcional, dependendo do ON DELETE)
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

      {exercises.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Dumbbell className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {q || metFilter !== "todos" || equipFilter !== "todos" || untaggedOnly
              ? "Nenhum exercício encontrado com esses filtros."
              : "Nenhum exercício ainda. Clique em \"Novo exercício\" para começar."}
          </p>
          {(q || metFilter !== "todos" || equipFilter !== "todos" || untaggedOnly) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setQ("");
                setMetFilter("todos");
                setEquipFilter("todos");
                setUntaggedOnly(false);
              }}
            >
              Limpar filtros
            </Button>
          )}
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
                        disabled={del.isPending || !!ex.coach_id === false}
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

      <ExerciseDialog
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

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ExerciseDialog({
  open,
  onOpenChange,
  editing,
  coachId,
  existingExercises,
  onOpenExisting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  coachId: string | undefined;
  existingExercises: any[];
  onOpenExisting: (ex: any) => void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [padrao, setPadrao] = useState("");
  const [metods, setMetods] = useState<Methodology[]>([]);
  const [equip, setEquip] = useState<Equipamento | "">("");
  const [unilateral, setUnilateral] = useState(false);
  const [instr, setInstr] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<any[] | null>(null);

  const isEdit = !!editing;
  const isEditingGlobal = isEdit && !editing?.coach_id;

  // Populate form whenever the dialog opens (or the target exercise changes).
  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome_pt ?? "");
    setPadrao(editing?.padrao_movimento ?? "");
    setMetods(editing?.metodologias ?? []);
    setEquip(((editing?.equipamento ?? [])[0] as Equipamento) ?? "");
    setUnilateral(editing?.unilateral ?? false);
    setInstr(editing?.instrucoes ?? "");
    setMedia(
      (editing?.exercise_media ?? []).map((m: any) => ({
        ...m,
        tipo: m.storage_path?.startsWith("youtube-") ? "youtube" : m.tipo,
      }))
    );
    setDuplicates(null);
  }, [open, editing]);

  function findDuplicatesFor(name: string): any[] {
    const target = normalizeName(name);
    if (!target) return [];
    return existingExercises.filter((ex) => {
      if (editing?.id && ex.id === editing.id) return false;
      return normalizeName(ex.nome_pt ?? "") === target;
    });
  }

  /** Salva de fato. Retorna null em sucesso ou mensagem de erro amigável. */
  async function persist(): Promise<string | null> {
    if (!coachId) {
      const m = "Perfil de treinador não encontrado";
      toast.error(m);
      return m;
    }
    setSaving(true);
    try {
      let exerciseId = editing?.id;
      let clonedFromGlobal = false;
      if (isEdit && !isEditingGlobal) {
        const { error } = await supabase
          .from("exercises")
          .update({
            nome_pt: nome,
            padrao_movimento: padrao || null,
            metodologias: metods,
            equipamento: equip ? [equip] : [],
            unilateral,
            instrucoes: instr || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("exercises")
          .insert({
            coach_id: coachId,
            nome_pt: nome,
            padrao_movimento: padrao || null,
            metodologias: metods,
            equipamento: equip ? [equip] : [],
            unilateral,
            instrucoes: instr || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        exerciseId = data.id;
        clonedFromGlobal = isEditingGlobal;
      }

      // Persistir mídias
      if (exerciseId) {
        // Primeiro remove as mídias atuais do banco para este exercício (vínculos)
        // No storage as mídias já foram gerenciadas pelo componente ExerciseMediaUpload
        await supabase.from("exercise_media").delete().eq("exercise_id", exerciseId);
        
        if (media.length > 0) {
          const { error: mediaError } = await supabase.from("exercise_media").insert(
            media.map((m) => ({
              exercise_id: exerciseId,
              storage_path: m.storage_path,
              url_publica: m.url_publica,
              tipo: m.tipo === "youtube" ? "video" : m.tipo, // Map youtube to video kind since db enum is restricted
            }))
          );
          if (mediaError) throw mediaError;
        }
      }


      toast.success(
        clonedFromGlobal
          ? "Cópia personalizada criada no seu catálogo"
          : isEdit
            ? "Exercício atualizado"
            : "Exercício criado"
      );
      qc.invalidateQueries({ queryKey: ["exercises"] });
      onOpenChange(false);
      return null;
    } catch (e: any) {
      const raw: string = e?.message ?? "Falha ao salvar";
      const isRls =
        e?.code === "42501" ||
        /row-level security|row level security/i.test(raw);
      const friendly = isRls
        ? "Este nome bate com um exercício existente que você não pode sobrescrever. Ajuste o nome e tente de novo."
        : raw;
      // Se o dialog de duplicados NÃO está aberto, cai no toast padrão.
      if (!duplicates) toast.error(friendly);
      return friendly;
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const dups = findDuplicatesFor(nome);
    if (dups.length > 0) {
      setDuplicates(dups);
      return;
    }
    void persist();
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar exercício" : "Novo exercício"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isEditingGlobal && (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 transition-colors duration-200"
            >
              <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                editar responde com mensagem de criação de copia, e apagar exercicio na apaga. O vínculo com o github é apenas de extração de informação e adequação, não pode ser uma limitação ao que o git apresenta
              </p>
            </div>
          )}
          <div>
            <Label>Nome (PT)</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Padrão de movimento</Label>
            <Input
              placeholder="hinge, squat, push, pull, core..."
              value={padrao}
              onChange={(e) => setPadrao(e.target.value)}
            />
          </div>
          <div>
            <Label>Equipamento</Label>
            <Select value={equip || "nenhum"} onValueChange={(v) => setEquip(v === "nenhum" ? "" : (v as Equipamento))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Sem equipamento</SelectItem>
                {EQUIPAMENTOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Modalidades</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={metods.includes(m)}
                    onCheckedChange={(v) => {
                      setMetods((prev) =>
                        v ? [...prev, m] : prev.filter((x) => x !== m)
                      );
                    }}
                  />
                  {METHODOLOGY_LABEL[m]}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={unilateral}
              onCheckedChange={(v) => setUnilateral(Boolean(v))}
            />
            Exercício unilateral
          </label>
          <div>
            <Label>Instruções</Label>
            <Textarea rows={3} value={instr} onChange={(e) => setInstr(e.target.value)} />
          </div>
          <div className="pt-2">
            <Label className="mb-2 block">Mídia (Fotos, Vídeos, YouTube)</Label>
            <ExerciseMediaUpload 
              exerciseId={editing?.id}
              initialMedia={media}
              onMediaChange={setMedia}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !nome.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DuplicateResolverDialog
      open={!!duplicates}
      onOpenChange={(v) => !v && setDuplicates(null)}
      typedName={nome}
      onRename={(newName) => {
        setNome(newName);
        // Re-avalia duplicados com o novo nome. Se sumiram, fecha o diálogo.
        const dups = findDuplicatesFor(newName);
        if (dups.length === 0) setDuplicates(null);
        else setDuplicates(dups);
      }}
      candidates={duplicates ?? []}
      isEdit={isEdit}
      editingId={editing?.id}
      coachId={coachId}
      persist={persist}
      onPersisted={() => setDuplicates(null)}
      onKeep={(existing) => {
        setDuplicates(null);
        onOpenChange(false);
        onOpenExisting(existing);
      }}
      onMerged={() => {
        setDuplicates(null);
        qc.invalidateQueries({ queryKey: ["exercises"] });
        onOpenChange(false);
      }}
    />
    </>
  );
}

function DuplicateResolverDialog({
  open,
  onOpenChange,
  typedName,
  onRename,
  candidates,
  isEdit,
  editingId,
  coachId,
  persist,
  onPersisted,
  onKeep,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  typedName: string;
  onRename: (newName: string) => void;
  candidates: any[];
  isEdit: boolean;
  editingId?: string;
  coachId?: string;
  persist: () => Promise<string | null>;
  onPersisted: () => void;
  onKeep: (existing: any) => void;
  onMerged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingAnyway, setSavingAnyway] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setRenameValue(`${typedName.trim()} (meu)`);
      setRenameOpen(false);
    }
  }, [open, typedName]);

  async function saveAnyway() {
    setSavingAnyway(true);
    setErrorMsg(null);
    const err = await persist();
    setSavingAnyway(false);
    if (err) setErrorMsg(err);
    else onPersisted();
  }

  async function renameAndSave() {
    const next = renameValue.trim();
    if (!next) return;
    onRename(next);
    // dá um tick pro state subir e depois tenta persistir
    setSavingAnyway(true);
    setErrorMsg(null);
    await new Promise((r) => setTimeout(r, 0));
    const err = await persist();
    setSavingAnyway(false);
    if (err) setErrorMsg(err);
    else onPersisted();
  }

  async function fuseIntoExisting(existing: any) {
    if (!isEdit || !editingId) {
      onKeep(existing);
      return;
    }
    setBusyId(existing.id);
    setErrorMsg(null);
    try {
      const { error } = await supabase.rpc("merge_exercises", {
        _keeper_id: existing.id,
        _duplicate_ids: [editingId],
      });
      if (error) throw error;
      toast.success("Exercícios fundidos");
      onMerged();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Falha ao fundir");
    } finally {
      setBusyId(null);
    }
  }

  const hasGlobal = candidates.some((c) => !c.coach_id);
  const busy = savingAnyway || !!busyId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-hidden p-0 sm:w-full">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
                Já existe algo parecido
              </DialogTitle>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {hasGlobal
                  ? "Esse nome já existe no banco base. Você pode usar o exercício existente ou criar uma versão sua."
                  : "Você já tem um exercício com esse nome."}{" "}
                <span className="text-foreground/80">
                  Equivalente a{" "}
                  <span className="font-medium text-foreground">
                    “{typedName.trim()}”
                  </span>
                  .
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[48vh] space-y-2 overflow-y-auto px-5 py-4 sm:px-6">
          {candidates.map((ex) => {
            const isGlobal = !ex.coach_id;
            const canFuseInto = isEdit && !isGlobal; // só funde num alvo do próprio coach durante edição
            const rowBusy = busyId === ex.id;
            return (
              <div
                key={ex.id}
                className="group rounded-xl border border-border/60 bg-card p-3.5 transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.02] sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {ex.nome_pt}
                      </p>
                      {isGlobal && (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-border/70 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          <Globe2 className="h-3 w-3" /> Global
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(ex.equipamento ?? []).map((eq: string) => (
                        <Badge
                          key={eq}
                          className="border-transparent bg-primary/10 text-[10px] font-medium text-primary hover:bg-primary/15"
                        >
                          {eq}
                        </Badge>
                      ))}
                      {(ex.metodologias ?? []).map((m: Methodology) => (
                        <Badge
                          key={m}
                          variant="secondary"
                          className="text-[10px] font-medium"
                        >
                          {METHODOLOGY_LABEL[m]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 transition-colors duration-150"
                      onClick={() => onKeep(ex)}
                      disabled={busy}
                    >
                      Usar este
                    </Button>
                    {canFuseInto && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 transition-colors duration-150"
                        onClick={() => fuseIntoExisting(ex)}
                        disabled={busy || !coachId}
                      >
                        {rowBusy ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Fundindo…
                          </>
                        ) : (
                          <>
                            <GitMerge className="h-3.5 w-3.5" />
                            Fundir neste
                          </>
                        )}
                      </Button>
                    )}
                    {(!isGlobal || (isGlobal && coachId)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={async () => {
                          if (confirm(`Deseja excluir permanentemente "${ex.nome_pt}"?`)) {
                            setBusyId(ex.id);
                            try {
                              const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
                              if (error) throw error;
                              toast.success("Exercício excluído");
                              onMerged(); 
                            } catch (e: any) {
                              toast.error(e.message);
                            } finally {
                              setBusyId(null);
                            }
                          }
                        }}
                        disabled={busy}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Excluir duplicado
                      </Button>
                    )}

                  </div>
                </div>
              </div>
            );
          })}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs leading-relaxed text-destructive"
            >
              {errorMsg}
            </div>
          )}

          {renameOpen && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 sm:p-4">
              <Label htmlFor="rename-input" className="text-xs font-medium text-muted-foreground">
                Novo nome
              </Label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <Input
                  id="rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void renameAndSave();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => void renameAndSave()}
                  disabled={busy || !renameValue.trim()}
                >
                  {savingAnyway ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Salvando…
                    </>
                  ) : (
                    "Renomear e salvar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Voltar
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setRenameOpen((v) => !v)}
              disabled={busy}
            >
              {renameOpen ? "Ocultar renomear" : "Ajustar nome"}
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => void saveAnyway()}
              disabled={busy}
            >
              {savingAnyway && !renameOpen ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Criar assim mesmo"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
type BulkMode = "manter" | "adicionar" | "remover" | "substituir";

const MODE_LABEL: Record<BulkMode, string> = {
  manter: "Manter",
  adicionar: "Adicionar",
  remover: "Remover",
  substituir: "Substituir",
};

function applyMode(current: string[], mode: BulkMode, values: string[]): string[] {
  const cur = Array.from(new Set(current ?? []));
  const val = Array.from(new Set(values));
  switch (mode) {
    case "manter":
      return cur;
    case "adicionar":
      return Array.from(new Set([...cur, ...val]));
    case "remover":
      return cur.filter((x) => !val.includes(x));
    case "substituir":
      return val;
  }
}

function ModeTabs({
  value,
  onChange,
  disabled,
}: {
  value: BulkMode;
  onChange: (v: BulkMode) => void;
  disabled?: boolean;
}) {
  const modes: BulkMode[] = ["manter", "adicionar", "remover", "substituir"];
  return (
    <div
      role="tablist"
      className="inline-flex w-full items-center gap-1 rounded-lg border border-border/60 bg-muted/60 p-1"
    >
      {modes.map((m) => {
        const active = value === m;
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(m)}
            className={
              "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 " +
              (active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {MODE_LABEL[m]}
          </button>
        );
      })}
    </div>
  );
}

function BulkChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 " +
        (active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function BulkEditDialog({
  open,
  onOpenChange,
  selectedIds,
  exercises,
  coachId,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  exercises: any[];
  coachId: string | undefined;
  onApplied: () => void;
}) {
  const [metMode, setMetMode] = useState<BulkMode>("manter");
  const [metValues, setMetValues] = useState<Methodology[]>([]);
  const [equipMode, setEquipMode] = useState<BulkMode>("manter");
  const [equipValues, setEquipValues] = useState<Equipamento[]>([]);
  const [padraoMode, setPadraoMode] = useState<BulkMode>("manter");
  const [padraoValue, setPadraoValue] = useState("");
  const [unilateralMode, setUnilateralMode] = useState<"manter" | "sim" | "nao">("manter");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setMetMode("manter");
      setMetValues([]);
      setEquipMode("manter");
      setEquipValues([]);
      setPadraoMode("manter");
      setPadraoValue("");
      setUnilateralMode("manter");
      setShowDeleteConfirm(false);
      setProgress(0);
    }
  }, [open]);

  const willChange =
    (metMode !== "manter" && (metMode === "substituir" || metValues.length > 0)) ||
    (equipMode !== "manter" && (equipMode === "substituir" || equipValues.length > 0)) ||
    (padraoMode !== "manter" && (padraoMode === "substituir" || padraoValue.trim().length > 0)) ||
    unilateralMode !== "manter";

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    for (const ex of exercises) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  const globalCount = useMemo(
    () => selectedIds.reduce((n, id) => n + (byId.get(id) && !byId.get(id).coach_id ? 1 : 0), 0),
    [selectedIds, byId]
  );

  async function apply() {
    if (!willChange || selectedIds.length === 0) return;
    if (globalCount > 0 && !coachId) {
      toast.error("Perfil de treinador não encontrado");
      return;
    }
    setApplying(true);
    setProgress(0);
    const batchSize = 20;
    let updated = 0;
    let cloned = 0;
    let failed = 0;
    let firstError: string | null = null;
    try {
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (id) => {
            const ex = byId.get(id);
            if (!ex) return { kind: "fail" as const };
            
            const nextMet =
              metMode !== "manter"
                ? applyMode(ex.metodologias ?? [], metMode, metValues)
                : ex.metodologias ?? [];
            const nextEquip =
              equipMode !== "manter"
                ? applyMode(ex.equipamento ?? [], equipMode, equipValues)
                : ex.equipamento ?? [];
            const nextPadrao = 
              padraoMode === "substituir" ? padraoValue :
              padraoMode === "adicionar" ? (ex.padrao_movimento ? `${ex.padrao_movimento}, ${padraoValue}` : padraoValue) :
              ex.padrao_movimento;
            const nextUnilateral = 
              unilateralMode === "sim" ? true :
              unilateralMode === "nao" ? false :
              ex.unilateral;

            const isGlobal = !ex.coach_id;
            if (isGlobal) {
              // Clone-on-write
              const { error } = await supabase.from("exercises").insert({
                coach_id: coachId,
                nome_pt: ex.nome_pt,
                padrao_movimento: nextPadrao || null,
                metodologias: nextMet,
                equipamento: nextEquip,
                unilateral: nextUnilateral ?? false,
                instrucoes: ex.instrucoes ?? null,
              });
              return { kind: error ? ("fail" as const) : ("cloned" as const), message: error?.message };
            }
            
            const patch: Record<string, any> = {
              atualizado_em: new Date().toISOString(),
              padrao_movimento: nextPadrao || null,
              unilateral: nextUnilateral,
            };
            if (metMode !== "manter") patch.metodologias = nextMet;
            if (equipMode !== "manter") patch.equipamento = nextEquip;
            const { error } = await supabase
              .from("exercises")
              .update(patch as any)
              .eq("id", id);
            return { kind: error ? ("fail" as const) : ("updated" as const), message: error?.message };
          })
        );
        for (const r of results) {
          if (r.kind === "updated") updated += 1;
          else if (r.kind === "cloned") cloned += 1;
          else {
            failed += 1;
            if (!firstError && r.message) firstError = r.message;
          }
        }
        setProgress(Math.round(((i + batch.length) / selectedIds.length) * 100));
      }
      const okParts: string[] = [];
      if (updated > 0) okParts.push(`${updated} atualizado${updated === 1 ? "" : "s"}`);
      if (cloned > 0)
        okParts.push(`${cloned} clonado${cloned === 1 ? "" : "s"} no seu catálogo`);
      const okMsg = okParts.join(" · ") || "Nenhum exercício alterado";
      if (failed === 0) {
        toast.success(okMsg);
      } else if (updated + cloned === 0) {
        toast.error(
          firstError
            ? `Nenhum exercício atualizado — ${firstError}`
            : `Nenhum exercício atualizado`
        );
      } else {
        toast.warning(
          `${okMsg} · ${failed} falharam${firstError ? ` — ${firstError}` : ""}`
        );
      }
      onApplied();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no ajuste em massa");
    } finally {
      setApplying(false);
    }
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    setApplying(true);
    setProgress(0);
    try {
      const { error } = await supabase
        .from("exercises")
        .delete()
        .in("id", selectedIds)
        .not("coach_id", "is", null); // Apenas deleta os próprios
      
      if (error) throw error;
      
      toast.success(`${selectedIds.length} exercícios removidos (apenas seus exercícios foram afetados)`);
      onApplied();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao excluir em massa");
    } finally {
      setApplying(false);
      setShowDeleteConfirm(false);
    }
  }

  function summary(): string {
    const parts: string[] = [];
    if (metMode !== "manter") {
      const labels = metValues.map((m) => METHODOLOGY_LABEL[m]).join(", ") || "—";
      parts.push(`Metodologias: ${MODE_LABEL[metMode]} (${labels})`);
    }
    if (equipMode !== "manter") {
      const labels = equipValues.join(", ") || "—";
      parts.push(`Equipamento: ${MODE_LABEL[equipMode]} (${labels})`);
    }
    if (padraoMode !== "manter") {
      parts.push(`Padrão: ${MODE_LABEL[padraoMode]} ("${padraoValue}")`);
    }
    if (unilateralMode !== "manter") {
      parts.push(`Unilateral: ${unilateralMode}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "Nenhuma alteração selecionada";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !applying && onOpenChange(v)}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-hidden p-0 sm:w-full">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <Wand2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
                Ajuste em massa
              </DialogTitle>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedIds.length}
                </span>{" "}
                exercício{selectedIds.length === 1 ? "" : "s"} selecionado
                {selectedIds.length === 1 ? "" : "s"}. Escolha o modo e os valores
                para cada grupo.
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[52vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {globalCount > 0 && (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5 transition-colors duration-200"
            >
              <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  {globalCount} exercício{globalCount === 1 ? "" : "s"}
                </span>{" "}
                da seleção {globalCount === 1 ? "é" : "são"} do{" "}
                <span className="font-medium text-foreground">catálogo compartilhado</span>.{" "}
                <span className="font-medium text-foreground">Cópias personalizadas</span> serão
                criadas no seu catálogo com as alterações — os originais não são alterados.
              </p>
            </div>
          )}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Modalidades
              </h3>
              <span className="text-xs text-muted-foreground">
                {metMode === "manter"
                  ? "sem alterar"
                  : `${metValues.length} selecionada${metValues.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <ModeTabs value={metMode} onChange={setMetMode} disabled={applying} />
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map((m) => (
                <BulkChip
                  key={m}
                  label={METHODOLOGY_LABEL[m]}
                  active={metValues.includes(m)}
                  disabled={metMode === "manter" || applying}
                  onClick={() =>
                    setMetValues((prev) =>
                      prev.includes(m)
                        ? prev.filter((x) => x !== m)
                        : [...prev, m]
                    )
                  }
                />
              ))}
            </div>
          </section>

          <div className="h-px bg-border/60" />

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Equipamento
              </h3>
              <span className="text-xs text-muted-foreground">
                {equipMode === "manter"
                  ? "sem alterar"
                  : `${equipValues.length} selecionado${equipValues.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <ModeTabs
              value={equipMode}
              onChange={setEquipMode}
              disabled={applying}
            />
            <div className="flex flex-wrap gap-1.5">
              {EQUIPAMENTOS.map((eq) => (
                <BulkChip
                  key={eq}
                  label={eq}
                  active={equipValues.includes(eq)}
                  disabled={equipMode === "manter" || applying}
                  onClick={() =>
                    setEquipValues((prev) =>
                      prev.includes(eq)
                        ? prev.filter((x) => x !== eq)
                        : [...prev, eq]
                    )
                  }
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Padrão de Movimento</h3>
            <ModeTabs value={padraoMode} onChange={setPadraoMode} disabled={applying} />
            <Input
              placeholder="Ex: squat, hinge, push..."
              value={padraoValue}
              onChange={(e) => setPadraoValue(e.target.value)}
              disabled={padraoMode === "manter" || applying}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Unilateral</h3>
            <div className="flex gap-2">
              {(["manter", "sim", "nao"] as const).map((m) => (
                <Button
                  key={m}
                  variant={unilateralMode === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnilateralMode(m)}
                  className="flex-1 capitalize"
                  disabled={applying}
                >
                  {m}
                </Button>
              ))}
            </div>
          </section>

          <div className="rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Prévia das Alterações
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/90">
              {summary()}
            </p>
          </div>

          {applying && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">
                Processando... {progress}%
              </p>
            </div>
          )}

          {!applying && (
            <div className="pt-2">
              {showDeleteConfirm ? (
                <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive">
                    Tem certeza? Isso removerá permanentemente os exercícios selecionados que foram criados por você.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={bulkDelete}
                    >
                      Confirmar Exclusão
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Selecionados
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Fechar
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void apply()}
            disabled={!willChange || applying || selectedIds.length === 0}
          >
            {applying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aplicando…
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
