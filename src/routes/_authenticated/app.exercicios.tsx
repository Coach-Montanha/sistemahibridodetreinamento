import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Upload,
  GitMerge,
  Dumbbell,
  AlertTriangle,
  Loader2,
  Globe2,
} from "lucide-react";
import { toast } from "sonner";
import {
  METHODOLOGY_LABEL,
  type Methodology,
} from "@/lib/methodology";
import { useCoach } from "@/hooks/use-coach";

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
  "Objetos Alternativos",
] as const;
type Equipamento = (typeof EQUIPAMENTOS)[number];

function ExerciciosPage() {
  const { data: coach } = useCoach();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [metFilter, setMetFilter] = useState<Methodology | "todos">("todos");
  const [equipFilter, setEquipFilter] = useState<Equipamento | "todos">("todos");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises", q, metFilter, equipFilter],
    queryFn: async () => {
      let query = supabase.from("exercises").select("*").order("nome_pt");
      if (q) query = query.ilike("nome_pt", `%${q}%`);
      if (metFilter !== "todos") query = query.contains("metodologias", [metFilter]);
      if (equipFilter !== "todos") query = query.contains("equipamento", [equipFilter]);
      const { data, error } = await query;
      if (error) throw error;
      return data;
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
      toast.success("Exercício removido");
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de Exercícios</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre exercícios com mídia para usar no construtor de sessão.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/app/exercicios/duplicados" })}
          >
            <GitMerge className="mr-2 h-4 w-4" /> Duplicados
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
            {q || metFilter !== "todos" || equipFilter !== "todos"
              ? "Nenhum exercício encontrado com esses filtros."
              : "Nenhum exercício ainda. Clique em \"Novo exercício\" para começar."}
          </p>
          {(q || metFilter !== "todos" || equipFilter !== "todos") && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setQ("");
                setMetFilter("todos");
                setEquipFilter("todos");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {exercises.map((ex: any) => (
            <Card key={ex.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
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
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(ex);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remover "${ex.nome_pt}"?`)) del.mutate(ex.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<any[] | null>(null);

  const isEdit = !!editing;

  // Populate form whenever the dialog opens (or the target exercise changes).
  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome_pt ?? "");
    setPadrao(editing?.padrao_movimento ?? "");
    setMetods(editing?.metodologias ?? []);
    setEquip(((editing?.equipamento ?? [])[0] as Equipamento) ?? "");
    setUnilateral(editing?.unilateral ?? false);
    setInstr(editing?.instrucoes ?? "");
    setFile(null);
    setDuplicates(null);
  }, [open, editing]);

  function findDuplicates(): any[] {
    const target = normalizeName(nome);
    if (!target) return [];
    return existingExercises.filter((ex) => {
      if (editing?.id && ex.id === editing.id) return false;
      return normalizeName(ex.nome_pt ?? "") === target;
    });
  }

  async function persist() {
    if (!coachId) return toast.error("Perfil de treinador não encontrado");
    setSaving(true);
    try {
      let exerciseId = editing?.id;
      if (isEdit) {
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
      }

      if (file && exerciseId) {
        const path = `${coachId}/${exerciseId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("exercise-media")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const tipo = file.type.startsWith("video")
          ? "video"
          : file.type.includes("gif")
            ? "gif"
            : "imagem";
        await supabase.from("exercise_media").insert({
          exercise_id: exerciseId,
          tipo,
          storage_path: path,
        });
      }

      toast.success(isEdit ? "Exercício atualizado" : "Exercício criado");
      qc.invalidateQueries({ queryKey: ["exercises"] });
      onOpenChange(false);
    } catch (e: any) {
      const msg: string = e?.message ?? "Falha ao salvar";
      const isRls =
        e?.code === "42501" ||
        /row-level security|row level security/i.test(msg);
      if (isRls) {
        const dups = findDuplicates();
        if (dups.length > 0) {
          toast.error("Já existe um exercício parecido", {
            description: "Escolha entre fundir ou manter os dois.",
          });
          setDuplicates(dups);
          return;
        }
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const dups = findDuplicates();
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
          <div>
            <Label>Mídia (vídeo, imagem ou gif)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="file"
                accept="video/*,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
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
      candidates={duplicates ?? []}
      isEdit={isEdit}
      editingId={editing?.id}
      coachId={coachId}
      onIgnoreAndSave={() => {
        setDuplicates(null);
        void persist();
      }}
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
  candidates,
  isEdit,
  editingId,
  coachId,
  onIgnoreAndSave,
  onKeep,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  typedName: string;
  candidates: any[];
  isEdit: boolean;
  editingId?: string;
  coachId?: string;
  onIgnoreAndSave: () => void;
  onKeep: (existing: any) => void;
  onMerged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fuseIntoExisting(existing: any) {
    if (!isEdit || !editingId) {
      // Modo criar: nada a fundir ainda — só abrir o existente para editar.
      onKeep(existing);
      return;
    }
    setBusyId(existing.id);
    try {
      const { error } = await supabase.rpc("merge_exercises", {
        _keeper_id: existing.id,
        _duplicate_ids: [editingId],
      });
      if (error) throw error;
      toast.success("Exercícios fundidos");
      onMerged();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao fundir");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-hidden p-0 sm:w-full">
        <div className="border-b border-border/60 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight">
                Já existe algo parecido
              </DialogTitle>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Encontramos {candidates.length}{" "}
                {candidates.length === 1 ? "exercício" : "exercícios"} com nome
                equivalente a{" "}
                <span className="font-medium text-foreground">
                  “{typedName.trim()}”
                </span>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-6 py-4">
          {candidates.map((ex) => {
            const isGlobal = !ex.coach_id;
            const canFuse = !isGlobal || !isEdit; // pode abrir global; não pode apagar global
            const busy = busyId === ex.id;
            return (
              <div
                key={ex.id}
                className="group rounded-lg border border-border/60 bg-card p-3 transition-colors duration-200 hover:border-primary/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
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
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => onKeep(ex)}
                      disabled={busy}
                    >
                      Abrir este
                    </Button>
                    {canFuse && isEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => fuseIntoExisting(ex)}
                        disabled={busy || !coachId}
                      >
                        {busy ? (
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={!!busyId}
          >
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onIgnoreAndSave}
            disabled={!!busyId}
          >
            Salvar mesmo assim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}