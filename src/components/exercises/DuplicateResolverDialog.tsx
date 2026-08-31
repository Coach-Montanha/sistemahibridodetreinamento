import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  GitMerge,
  Globe2,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";

export function DuplicateResolverDialog({
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
            const canFuseInto = isEdit && !isGlobal;
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
