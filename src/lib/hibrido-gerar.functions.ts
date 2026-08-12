import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buscarCandidatosDoMolde,
  montarHibridoPrompt,
  normalizarPrescricaoHibrido,
  type BlocoTemplate,
  type HibridoPayload,
  type SessaoTemplate,
} from "@/lib/hibrido-ia.server";

// ---------------------------------------------------------------------------
// Validação de entrada — espelha 1:1 os campos de BlocoTemplate/HibridoPayload
// emitidos pelo ConstrutorMoldeDialog.tsx.
// ---------------------------------------------------------------------------

const FORMATO = z.enum([
  "preparacao_movimento",
  "forca_tecnica_pct",
  "emom",
  "e2mom",
  "amrap",
  "circuito",
  "kb_timed_sets",
  "metcon",
  "bodybuilding_sets",
  "finalizador",
  "livre",
]);

const FONTE_EXERCICIOS = z
  .object({
    metodologias: z.array(z.string()).optional(),
    equipamento: z.array(z.string()).optional(),
  })
  .default({});

const BLOCO = z.object({
  chave: z.string().min(1),
  formato: FORMATO,
  titulo: z.string().nullable().optional(),
  duracaoMin: z.number().nullable(),
  seriesMin: z.number().nullable(),
  seriesMax: z.number().nullable(),
  numeroExercicios: z.number().int().min(1).max(8),
  repsPorExercicio: z.union([z.string(), z.number()]).nullable(),
  modoExecucao: z.enum(["circuito", "series_fixas"]),
  descansoAposSeg: z.number().min(0).default(0),
  descansoEntreSeriesSeg: z.number().nullable().optional(),
  intervaloMin: z.number().nullable().optional(),
  percentual1rm: z.number().nullable().optional(),
  selecaoExercicios: z.enum(["ia", "manual"]),
  exerciciosFixos: z.array(z.string()).default([]),
  slot: z.enum(["mobilidade", "aquecimento"]).nullable().optional(),
  fonteExercicios: FONTE_EXERCICIOS,
});

const INPUT = z.object({
  modalidade: z.enum(["hibrido", "kettlebell_fitness"]),
  tituloPrograma: z.string().min(1).max(120),
  numeroSessoes: z.number().int().min(1).max(52),
  /** Quantas sessões cabem por semana antes de abrir uma nova program_week. Padrão 6 (D1-D6, como nas planilhas). */
  diasPorSemana: z.number().int().min(1).max(7).default(6),
  dataInicio: z.string().nullable().optional(),
  sessaoTemplate: z.array(BLOCO).min(1),
  instrucoes: z.string().max(4000).default(""),
});

// ---------------------------------------------------------------------------
// Config por formato — espelha exatamente o que BlockFormats.tsx grava em
// session_blocks.config para cada formato, para que o SessionBuilder
// renderize a sessão gerada sem precisar de nenhuma migração de dados.
// ---------------------------------------------------------------------------

function configDoBloco(b: BlocoTemplate): Record<string, unknown> {
  const base = { chave: b.chave, descanso_apos_seg: b.descansoAposSeg };


  switch (b.formato) {
    case "preparacao_movimento":
      return { ...base, rounds: b.seriesMin ?? 4, round_min: b.duracaoMin ?? 2, modo_execucao: b.modoExecucao };
    case "forca_tecnica_pct": {
      const reps = typeof b.repsPorExercicio === "number" ? b.repsPorExercicio : Number(b.repsPorExercicio) || 6;
      return { ...base, passos: [{ pct: b.percentual1rm ?? 70, sets: b.seriesMin ?? 3, reps }] };
    }
    case "emom":
    case "e2mom":
      return {
        ...base,
        rounds: b.seriesMin ?? 8,
        intervalo_min: b.intervaloMin ?? (b.formato === "e2mom" ? 2 : 1),
        modo_execucao: b.modoExecucao,
      };
    case "amrap":
      return { ...base, duracao_min: b.duracaoMin ?? 12 };
    case "kb_timed_sets":
      // Estrutura AQ/TR é configurada manualmente depois no SessionBuilder;
      // aqui só preservamos o descanso entre blocos.
      return { ...base };
    case "livre":
      return { ...base, instrucoes: "" };
    default:
      // circuito | bodybuilding_sets | metcon | finalizador (SetsRepsForm)
      return {
        ...base,
        series: b.seriesMin ?? 3,
        reps: b.repsPorExercicio != null ? String(b.repsPorExercicio) : "",
        descanso_seg: b.descansoEntreSeriesSeg ?? 60,
        modo_execucao: b.modoExecucao,
      };
  }
}

export type GerarSessoesHibridoResultado = {
  programaId: string;
  sessoesGeradas: number;
  notes: string;
  avisos: string[];
};

export const gerarSessoesHibrido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => INPUT.parse(input))
  .handler(async ({ data, context }): Promise<GerarSessoesHibridoResultado> => {
    const supabase = context.supabase;
    const template = data.sessaoTemplate as unknown as SessaoTemplate;

    // 1. Resolve o coach do usuário autenticado (RLS já restringe à própria linha).
    const { data: coachRow, error: coachErr } = await supabase
      .from("coaches")
      .select("id")
      .maybeSingle();
    if (coachErr) throw new Error(coachErr.message);
    if (!coachRow) throw new Error("Treinador não encontrado para este usuário");
    const coachId = coachRow.id as string;

    // 2. Busca, por bloco marcado "ia", o pool de exercícios candidatos.
    const candidatos = await buscarCandidatosDoMolde(supabase, template);

    const avisos: string[] = [];
    for (const b of template) {
      if (b.selecaoExercicios === "ia" && (candidatos[b.chave]?.length ?? 0) === 0) {
        avisos.push(
          `Nenhum exercício encontrado na biblioteca para o bloco "${b.titulo ?? b.formato}" com os filtros informados — verifique metodologias/equipamento.`,
        );
      }
    }

    // 3. Monta o prompt único (cobre todas as numeroSessoes de uma vez) e chama o gateway.
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento");

    const prompt = montarHibridoPrompt({
      payload: data as unknown as HibridoPayload,
      candidatos,
      instrucoes: data.instrucoes,
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error(`AI gateway [${res.status}]: ${corpo}`);
      const msg =
        res.status === 429
          ? "Limite de uso da IA atingido, tente em instantes"
          : res.status === 402
            ? "Créditos da IA esgotados"
            : `Falha ao gerar a prescrição (erro ${res.status})`;
      throw new Error(msg);
    }

    const respostaGateway: any = await res.json();
    const conteudo = respostaGateway?.choices?.[0]?.message?.content;
    if (typeof conteudo !== "string" || conteudo.trim().length === 0) {
      throw new Error("A IA não retornou conteúdo. Tente novamente.");
    }

    // 4. Parsing defensivo + validação de segurança (IDs alucinados são descartados).
    const prescricao = normalizarPrescricaoHibrido(conteudo, template, candidatos);

    // 5. Cria o programa e distribui as sessões em semanas de `diasPorSemana`.
    const numeroSemanas = Math.max(1, Math.ceil(data.numeroSessoes / data.diasPorSemana));

    const { data: prog, error: progErr } = await supabase
      .from("programs")
      .insert({
        coach_id: coachId,
        metodologia: data.modalidade,
        titulo: data.tituloPrograma,
        data_inicio: data.dataInicio ?? new Date().toISOString().slice(0, 10),
        duracao_semanas: numeroSemanas,
      })
      .select("id")
      .single();
    if (progErr || !prog) throw new Error(progErr?.message ?? "Falha ao criar o programa");

    let numeroSemanaAtual = 0;
    let semanaId: string | null = null;
    let numeroDiaNaSemana = 0;

    for (let i = 0; i < prescricao.sessoes.length; i++) {
      const sessaoPrescrita = prescricao.sessoes[i];

      if (numeroDiaNaSemana === 0 || numeroDiaNaSemana > data.diasPorSemana) {
        numeroSemanaAtual += 1;
        numeroDiaNaSemana = 1;
        const { data: semana, error: semanaErr } = await supabase
          .from("program_weeks")
          .insert({ program_id: prog.id, numero_semana: numeroSemanaAtual })
          .select("id")
          .single();
        if (semanaErr || !semana) throw new Error(semanaErr?.message ?? "Falha ao criar a semana");
        semanaId = semana.id;
      }

      const { data: sess, error: sessErr } = await supabase
        .from("sessions")
        .insert({
          program_week_id: semanaId!,
          numero_dia: numeroDiaNaSemana,
          titulo: `Sessão ${i + 1}`,
          status: "rascunho",
        })
        .select("id")
        .single();
      if (sessErr || !sess) throw new Error(sessErr?.message ?? "Falha ao criar a sessão");
      numeroDiaNaSemana += 1;

      let ordemBloco = 1;
      for (const blocoTpl of template) {
        const resultadoBloco = sessaoPrescrita.blocos.find((b) => b.chave === blocoTpl.chave);
        const exercicioIds = resultadoBloco?.exerciciosIds ?? [];

        const { data: blocoRow, error: blocoErr } = await supabase
          .from("session_blocks")
          .insert({
            session_id: sess.id,
            ordem: ordemBloco,
            formato: blocoTpl.formato,
            titulo: blocoTpl.titulo ?? null,
            duracao_min: blocoTpl.duracaoMin,
            config: configDoBloco(blocoTpl) as any,
          })
          .select("id")
          .single();
        if (blocoErr || !blocoRow) throw new Error(blocoErr?.message ?? "Falha ao criar o bloco");
        ordemBloco += 1;

        if (exercicioIds.length > 0) {
          const rows = exercicioIds.map((exId, idx) => ({
            session_block_id: blocoRow.id,
            exercise_id: exId,
            ordem: idx + 1,
            series: blocoTpl.seriesMin ?? null,
            reps: blocoTpl.repsPorExercicio != null ? String(blocoTpl.repsPorExercicio) : null,
            pct_1rm: blocoTpl.percentual1rm ?? null,
            descanso_seg: blocoTpl.descansoEntreSeriesSeg ?? null,
          }));
          const { error: exErr } = await supabase.from("session_block_exercises").insert(rows);
          if (exErr) throw new Error(exErr.message);
        }
      }
    }

    return {
      programaId: prog.id,
      sessoesGeradas: prescricao.sessoes.length,
      notes: prescricao.notes,
      avisos,
    };
  });