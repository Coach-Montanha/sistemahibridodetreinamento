import { memo, useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Timer, Weight, ListOrdered } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { prescribeTrainingWithAi } from "@/lib/prescricao-ia.functions";
import type { AiDay, AiPrescription } from "@/lib/prescricao-ia.server";

const PLACEHOLDER = `Ex.: divisão A/B/C/D para hipertrofia, 4 treinos por semana.
Dia A peito e tríceps, Dia B costas e bíceps, Dia C pernas, Dia D ombros e core.
4 séries de 8 a 12 repetições nos compostos e 3x12 nos isoladores, 90s de descanso.
Priorizar barra e halteres; incluir progressão de carga semanal.`;

/** "4x10" -> { series: 4, reps: "10" } */
function parseSetsReps(v: string): { series: number | null; reps: string | null } {
  const m = v.match(/^\s*(\d+)\s*[xX×]\s*(.+)$/);
  if (m) return { series: Number(m[1]), reps: m[2].trim() };
  const t = v.trim();
  return { series: null, reps: t.length ? t : null };
}

/** "60kg" -> 60 ; "leve" -> null (vira observação) */
function parseCarga(v: string): number | null {
  const m = v.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function juntarObs(...partes: (string | null | undefined)[]) {
  const s = partes.filter((p) => p && p.trim().length > 0).join(" · ");
  return s.length ? s : null;
}

const DiaCard = memo(function DiaCard({ dia, index }: { dia: AiDay; index: number }) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold tracking-tight">
          {dia.name || `Treino ${index + 1}`}
        </h4>
        {dia.day_label && (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {dia.day_label}
          </Badge>
        )}
      </header>
      {dia.description && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {dia.description}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {dia.exercises.map((e, i) => (
          <li
            key={`${e.name}-${i}`}
            className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium">{e.name}</span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {e.sets_reps && (
                  <span className="inline-flex items-center gap-1">
                    <ListOrdered className="h-3 w-3" />
                    {e.sets_reps}
                  </span>
                )}
                {e.load && (
                  <span className="inline-flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {e.load}
                  </span>
                )}
                {e.rest_seconds != null && (
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {e.rest_seconds}s
                  </span>
                )}
              </span>
            </div>
            {e.observations && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                {e.observations}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
});

export function PrescreverIaDialog({
  programa,
  onOpenChange,
}: {
  programa: { id: string; titulo?: string | null } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const gerar = useServerFn(prescribeTrainingWithAi);
  const [prompt, setPrompt] = useState("");
  const [previa, setPrevia] = useState<AiPrescription | null>(null);

  const limpar = useCallback(() => {
    setPrompt("");
    setPrevia(null);
  }, []);

  const gerarMut = useMutation({
    mutationFn: async () => {
      if (!programa) throw new Error("Programa não selecionado");
      return gerar({ data: { programId: programa.id, prompt: prompt.trim() } });
    },
    onSuccess: (res) => setPrevia(res),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar a prescrição"),
  });

  const salvarMut = useMutation({
    mutationFn: async () => {
      if (!programa || !previa) throw new Error("Nada para salvar");

      // Semana alvo: a última existente, ou cria a primeira.
      const { data: semanas, error: we } = await supabase
        .from("program_weeks")
        .select("id, numero_semana")
        .eq("program_id", programa.id)
        .order("numero_semana", { ascending: false })
        .limit(1);
      if (we) throw we;

      let weekId = semanas?.[0]?.id as string | undefined;
      if (!weekId) {
        const { data: nova, error } = await supabase
          .from("program_weeks")
          .insert({ program_id: programa.id, numero_semana: 1 })
          .select("id")
          .single();
        if (error) throw error;
        weekId = nova.id;
      }

      const { data: ultimas, error: se } = await supabase
        .from("sessions")
        .select("numero_dia")
        .eq("program_week_id", weekId)
        .order("numero_dia", { ascending: false })
        .limit(1);
      if (se) throw se;
      let proximoDia = (ultimas?.[0]?.numero_dia ?? 0) + 1;

      for (const dia of previa.days) {
        const { data: sess, error: ie } = await supabase
          .from("sessions")
          .insert({
            program_week_id: weekId,
            numero_dia: proximoDia,
            titulo: dia.name || `Treino ${proximoDia}`,
            status: "rascunho",
          })
          .select("id")
          .single();
        if (ie) throw ie;
        proximoDia += 1;

        const { data: bloco, error: be } = await supabase
          .from("session_blocks")
          .insert({
            session_id: sess.id,
            ordem: 1,
            formato: "bodybuilding_sets",
            titulo: dia.day_label || dia.description || "Bloco principal",
            config: {},
          })
          .select("id")
          .single();
        if (be) throw be;

        if (dia.exercises.length) {
          const rows = dia.exercises.map((e, i) => {
            const { series, reps } = parseSetsReps(e.sets_reps);
            const carga = parseCarga(e.load);
            return {
              session_block_id: bloco.id,
              nome_livre: e.name,
              ordem: i + 1,
              series,
              reps,
              carga_kg: carga,
              descanso_seg: e.rest_seconds,
              observacoes: juntarObs(
                e.observations,
                carga == null && e.load ? `Carga: ${e.load}` : null,
              ),
            };
          });
          const { error: xe } = await supabase
            .from("session_block_exercises")
            .insert(rows);
          if (xe) throw xe;
        }
      }

      // Proveniência: guarda prompt + timestamp sem criar coluna nova.
      const { data: prog } = await supabase
        .from("programs")
        .select("regras_progressao")
        .eq("id", programa.id)
        .maybeSingle();
      const regras =
        prog?.regras_progressao && typeof prog.regras_progressao === "object"
          ? (prog.regras_progressao as Record<string, unknown>)
          : {};
      await supabase
        .from("programs")
        .update({
          regras_progressao: {
            ...regras,
            ai: {
              ai_prompt: prompt.trim(),
              ai_generated_at: new Date().toISOString(),
              notes: previa.notes || null,
            },
          },
        })
        .eq("id", programa.id);

      return previa.days.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} treino(s) adicionado(s) à rotina`);
      qc.invalidateQueries({ queryKey: ["programas"] });
      limpar();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao adicionar os treinos"),
  });

  const podeGerar = useMemo(
    () => prompt.trim().length >= 3 && !gerarMut.isPending,
    [prompt, gerarMut.isPending],
  );

  return (
    <Dialog
      open={!!programa}
      onOpenChange={(o) => {
        if (!o) limpar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            Prescrever com IA
            <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wide">
              Musculação
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {programa?.titulo
              ? `Gerando para "${programa.titulo}".`
              : "Gere uma prescrição estruturada."}{" "}
            Motor dedicado de musculação: a IA já considera período, objetivos e
            nomenclatura dos dias da rotina — descreva a divisão e o volume desejados.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <label
              htmlFor="prompt-ia"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Instruções
            </label>
            <Textarea
              id="prompt-ia"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={6}
              maxLength={4000}
              disabled={gerarMut.isPending || salvarMut.isPending}
              className="resize-y text-sm leading-relaxed transition-colors duration-200"
            />
            <div className="flex justify-end text-[11px] tabular-nums text-muted-foreground">
              {prompt.trim().length}/4000
            </div>
            <Button
              onClick={() => gerarMut.mutate()}
              disabled={!podeGerar}
              className="w-full gap-2 transition-all duration-200 sm:w-auto"
            >
              {gerarMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando prescrição...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar prescrição
                </>
              )}
            </Button>
          </div>

          {previa ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prévia · {previa.days.length} treino(s)
              </h3>
              {previa.days.map((d, i) => (
                <DiaCard key={`${d.name}-${i}`} dia={d} index={i} />
              ))}
              {previa.notes && (
                <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                  <p className="text-xs font-semibold text-foreground">
                    Observações finais
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {previa.notes}
                  </p>
                </div>
              )}
            </section>
          ) : (
            !gerarMut.isPending && (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma prescrição gerada ainda.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Descreva a divisão desejada e clique em “Gerar prescrição”.
                </p>
              </div>
            )
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-5 py-4 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => {
              limpar();
              onOpenChange(false);
            }}
            disabled={salvarMut.isPending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => salvarMut.mutate()}
            disabled={!previa || salvarMut.isPending}
            className="w-full gap-2 sm:w-auto"
          >
            {salvarMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvarMut.isPending ? "Adicionando..." : "Adicionar treinos à rotina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PrescreverIaDialog;
