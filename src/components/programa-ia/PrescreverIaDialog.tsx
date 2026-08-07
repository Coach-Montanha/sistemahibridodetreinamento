import { memo, useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Info,
  ListOrdered,
  Loader2,
  Sparkles,
  Timer,
  Weight,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { prescribeTrainingWithAi } from "@/lib/prescricao-ia.functions";
import type { AiDay, AiPrescription } from "@/lib/prescricao-ia.server";
import type { KbSportPayload } from "@/lib/kb-sport-ia.server";
import type { WlPayload } from "@/lib/weightlifting-ia.server";
import type { TfPayload } from "@/lib/funcional-ia.server";

const PLACEHOLDER = `Ex.: divisão A/B/C/D para hipertrofia, 4 treinos por semana.
Dia A peito e tríceps, Dia B costas e bíceps, Dia C pernas, Dia D ombros e core.
4 séries de 8 a 12 repetições nos compostos e 3x12 nos isoladores, 90s de descanso.
Priorizar barra e halteres; incluir progressão de carga semanal.`;

const EXEMPLOS = [
  {
    chip: "Hipertrofia 4x/semana",
    texto:
      "Divisão A/B/C/D para hipertrofia, 4 treinos por semana. 4x8-12 nos compostos e 3x12 nos isoladores, 90s de descanso.",
  },
  {
    chip: "Full body 3x/semana",
    texto:
      "Full body 3 vezes por semana, 5 a 6 exercícios por treino, 3x10, 60s de descanso, foco em barra e halteres.",
  },
  {
    chip: "Foco em membros inferiores",
    texto:
      "Divisão de 3 treinos com ênfase em membros inferiores (2 de perna e 1 de superiores), 4x8, 120s de descanso nos compostos.",
  },
] as const;

const LIMITACOES = [
  "Exclusivo da modalidade Musculação.",
  "A IA monta a prescrição com exercícios sugeridos de musculação.",
  "Suporta exercícios individuais e combinados (bi-set, tri-set).",
  "Até 4.000 caracteres por prompt.",
  "A IA gera uma prévia — nada é salvo até você confirmar.",
  "Os treinos entram na última semana da rotina, seguindo a numeração de dias existente.",
  "Cargas e observações são sugestões: revise antes de publicar.",
];

const COMBINACAO_LABEL: Record<string, string> = {
  biset: "Bi-set",
  triset: "Tri-set",
  superset: "Superset",
};

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

/**
 * Converte os grupos da IA ("A1"/"A2") no mapa `grupos` por ordem que o
 * construtor de sessão já lê do config do bloco.
 */
function gruposDoDia(dia: AiDay): Record<string, Record<string, string>> {
  const grupos: Record<string, string> = {};
  dia.exercises.forEach((e, i) => {
    if (e.group_type !== "individual" && e.group) {
      grupos[String(i + 1)] = e.group.charAt(0).toUpperCase();
    }
  });
  return Object.keys(grupos).length ? { grupos } : {};
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
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {e.name}
                {e.group_type !== "individual" && e.group && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-[10px] uppercase tracking-wide text-primary"
                  >
                    {COMBINACAO_LABEL[e.group_type] ?? "Combinado"} · {e.group}
                  </Badge>
                )}
              </span>
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
  escopo,
  kb,
  wl,
  tf,
  co,
  onOpenChange,
}: {
  programa: { id: string; titulo?: string | null } | null;
  escopo?: {
    label?: string | null;
    semanas?: number | null;
    diasPorSemana?: number | null;
    dataInicio?: string | null;
  } | null;
  /** Configuração do Kettlebell Sport (quando a rotina é dessa modalidade). */
  kb?: KbSportPayload | null;
  /** Configuração do Levantamento de Peso (quando a rotina é dessa modalidade). */
  wl?: WlPayload | null;
  /** Configuração do Treinamento Funcional (quando a rotina é dessa modalidade). */
  tf?: TfPayload | null;
  /** Configuração da Corrida (quando a rotina é dessa modalidade). */
  co?: import("@/lib/corrida-ia.server").CorridaPayload | null;
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
      return gerar({
        data: {
          programId: programa.id,
          prompt: prompt.trim(),
          diasPorSemana: escopo?.diasPorSemana ?? null,
          escopoLabel: escopo?.label ?? null,
          kb: kb ?? null,
          wl: wl ?? null,
          tf: tf ?? null,
          co: co ?? null,
        },
      });
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
            formato: kb
              ? "kb_timed_sets"
              : wl
                ? "forca_tecnica_pct"
                : co
                  ? "livre"
                  : "bodybuilding_sets",
            titulo: dia.day_label || dia.description || "Bloco principal",
            config: gruposDoDia(dia),
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
    () => !gerarMut.isPending,
    [gerarMut.isPending],
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
              {kb ? "Kettlebell Sport" : wl ? "Levantamento de Peso" : "Musculação"}
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Rotina alvo", value: programa?.titulo ?? "—" },
              { label: "Escopo", value: escopo?.label ?? "—" },
              {
                label: "Duração",
                value: escopo?.semanas ? `${escopo.semanas} semana(s)` : "—",
              },
              {
                label: "Dias/semana",
                value: escopo?.diasPorSemana ? `${escopo.diasPorSemana}` : "—",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
              >
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {k.label}
                </p>
                <p title={k.value} className="mt-0.5 truncate text-sm font-medium tabular-nums">
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {escopo && (
            <p className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              A IA já recebe automaticamente:{" "}
              <strong className="text-foreground">
                {escopo.label ?? "escopo selecionado"}
              </strong>
              {escopo.semanas ? ` · ${escopo.semanas} semana(s)` : ""}
              {escopo.diasPorSemana ? ` · ${escopo.diasPorSemana} treino(s) por semana` : ""}
              {escopo.dataInicio ? ` · início em ${escopo.dataInicio}` : ""}. Você não
              precisa repetir isso no prompt — escreva apenas as preferências extras (ou
              deixe em branco).
            </p>
          )}

          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-left text-xs font-medium transition-colors duration-200 hover:bg-muted/40">
              <Info className="h-3.5 w-3.5 text-primary" />
              Como usar e limitações
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 px-3 pb-1 pt-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Descreva: divisão dos dias (A/B/C…), frequência semanal, objetivo,
                séries e repetições, descanso e equipamentos preferidos.
              </p>
              <ul className="space-y-1">
                {LIMITACOES.map((l) => (
                  <li
                    key={l}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span aria-hidden className="text-primary">
                      •
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <label
              htmlFor="prompt-ia"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Instruções
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXEMPLOS.map((ex) => (
                <Button
                  key={ex.chip}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={gerarMut.isPending || salvarMut.isPending}
                  onClick={() => setPrompt(ex.texto)}
                  className="h-7 rounded-full px-3 text-[11px] font-medium"
                >
                  {ex.chip}
                </Button>
              ))}
            </div>
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
