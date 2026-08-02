import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Lock, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";

const STATUS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "publicada", label: "Publicada" },
  { value: "arquivada", label: "Arquivada" },
] as const;

type Form = {
  titulo: string;
  descricao: string;
  metodologia: Methodology;
  data_inicio: string;
  duracao_semanas: number;
  status: string;
};

/** Metadados de IA gravados em `regras_progressao.ai` na geração. */
function lerIa(regras: unknown): {
  prompt: string;
  geradoEm: string | null;
  notas: string | null;
} | null {
  if (!regras || typeof regras !== "object") return null;
  const ai = (regras as Record<string, any>)["ai"];
  if (!ai || typeof ai !== "object") return null;
  return {
    prompt: typeof ai.ai_prompt === "string" ? ai.ai_prompt : "",
    geradoEm: typeof ai.ai_generated_at === "string" ? ai.ai_generated_at : null,
    notas: typeof ai.notes === "string" ? ai.notes : null,
  };
}

export function ProgramaEditorDialog({
  programaId,
  onOpenChange,
}: {
  programaId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const { data: programa, isLoading } = useQuery({
    queryKey: ["programa-edit", programaId],
    enabled: !!programaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, titulo, descricao, metodologia, data_inicio, duracao_semanas, status, regras_progressao",
        )
        .eq("id", programaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!programa) return;
    setForm({
      titulo: programa.titulo ?? "",
      descricao: programa.descricao ?? "",
      metodologia: programa.metodologia as Methodology,
      data_inicio: programa.data_inicio ?? "",
      duracao_semanas: programa.duracao_semanas ?? 1,
      status: programa.status ?? "rascunho",
    });
  }, [programa]);

  const ia = lerIa(programa?.regras_progressao);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!programaId || !form) throw new Error("Nada para salvar");
      if (!form.titulo.trim()) throw new Error("Informe um título");
      const { error } = await supabase
        .from("programs")
        .update({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          metodologia: form.metodologia,
          data_inicio: form.data_inicio || null,
          duracao_semanas: Math.max(1, Math.min(52, Number(form.duracao_semanas) || 1)),
          status: form.status as any,
        })
        .eq("id", programaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programa atualizado");
      qc.invalidateQueries({ queryKey: ["programas"] });
      qc.invalidateQueries({ queryKey: ["programa-edit", programaId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  return (
    <Dialog open={!!programaId} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left sm:px-6">
          <DialogTitle className="text-base">Editar programa</DialogTitle>
          <DialogDescription className="text-xs">
            Altere título, descrição, modalidade, período e status desta rotina.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {isLoading || !form ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="prog-titulo">Título</Label>
                <Input
                  id="prog-titulo"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: Hipertrofia — Bloco 1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-desc">Descrição / objetivos</Label>
                <Textarea
                  id="prog-desc"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Objetivos, contexto do aluno, observações gerais…"
                  className="resize-y text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Modalidade</Label>
                  <Select
                    value={form.metodologia}
                    onValueChange={(v) =>
                      setForm({ ...form, metodologia: v as Methodology })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {METHODOLOGY_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prog-inicio">Data de início</Label>
                  <Input
                    id="prog-inicio"
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prog-semanas">Duração (semanas)</Label>
                  <Input
                    id="prog-semanas"
                    type="number"
                    min={1}
                    max={52}
                    value={form.duracao_semanas}
                    onChange={(e) =>
                      setForm({ ...form, duracao_semanas: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {ia && (
                <section className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                  <header className="flex flex-wrap items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Prompt usado na geração</h4>
                    <Badge
                      variant="outline"
                      className="gap-1 border-border/60 text-[10px] uppercase tracking-wide"
                    >
                      <Lock className="h-3 w-3" /> Privado
                    </Badge>
                    {ia.geradoEm && (
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {new Date(ia.geradoEm).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </header>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
{ia.prompt.trim() || "— (gerado apenas com o escopo selecionado, sem instruções extras)"}
                  </pre>
                  {ia.notas && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Observações da IA:</strong>{" "}
                      {ia.notas}
                    </p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(ia.prompt);
                          toast.success("Prompt copiado");
                        } catch {
                          toast.error("Não foi possível copiar");
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar prompt
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
                    Visível apenas para você — o prompt nunca é exibido ao aluno nem nas
                    exportações.
                  </p>
                </section>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => salvar.mutate()}
            disabled={!form || salvar.isPending}
            className="gap-2"
          >
            {salvar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}