import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Wand2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { EQUIPAMENTOS, type Equipamento } from "./ExerciseEditorDialog";

const METHODS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

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

export function BulkEditDialog({
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
      // Seleções feitas em "todo o banco" incluem IDs fora da lista carregada.
      // Buscamos esses registros antes de aplicar as alterações.
      const resolved = new Map<string, any>(byId);
      const missing = selectedIds.filter((id) => !resolved.has(id));
      for (let i = 0; i < missing.length; i += 500) {
        const chunk = missing.slice(i, i + 500);
        const { data, error } = await supabase
          .from("exercises")
          .select(
            "id, coach_id, nome_pt, metodologias, equipamento, padrao_movimento, unilateral, instrucoes"
          )
          .in("id", chunk);
        if (error) throw error;
        for (const row of data ?? []) resolved.set(row.id, row);
      }

      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (id) => {
            const ex = resolved.get(id);
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
        .not("coach_id", "is", null);
      
      if (error) throw error;
      
      toast.success(`${selectedIds.length} exercícios removidos`);
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
