import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SYSTEM_PROMPT,
  calcularDataFim,
  detectarNomenclatura,
  mensagemDeErroGateway,
  montarUserPrompt,
  normalizarPrescricao,
  type AiPrescription,
} from "@/lib/prescricao-ia.server";
import {
  KB_SPORT_SYSTEM_PROMPT,
  escolherEscola,
  montarKbSportPrompt,
  type EscolaMetodologica,
} from "@/lib/kb-sport-ia.server";
import {
  WL_SYSTEM_PROMPT,
  escolherEscolaWl,
  montarWlPrompt,
  type EscolaWeightlifting,
} from "@/lib/weightlifting-ia.server";
import {
  TF_SYSTEM_PROMPT,
  escolherEscolaFuncional,
  montarFuncionalPrompt,
  type EscolaFuncional,
} from "@/lib/funcional-ia.server";
import {
  CO_SYSTEM_PROMPT,
  escolherEscolaCorrida,
  montarCorridaPrompt,
  type EscolaCorrida,
} from "@/lib/corrida-ia.server";
import {
  buscarCandidatosDoMolde,
  montarHibridoPrompt,
  normalizarPrescricaoHibrido,
  type HibridoPayload,
} from "@/lib/hibrido-ia.server";

const CARGA = z
  .object({
    pesoKettlebellKg: z.number().nullable().default(null),
    repsAtuais10min: z.number().nullable().default(null),
  })
  .optional();

const KB = z
  .object({
    escolaMetodologica: z.enum([
      "auto",
      "fedorenko",
      "rudnev",
      "vorotyntsev",
      "denisov",
      "vasilev",
      "gomonov",
    ]),
    nivelAtleta: z.enum(["iniciante", "intermediario", "avancado", "elite"]),
    disciplina: z.enum(["biathlon", "long_cycle", "ambas"]),
    pesoCorporalKg: z.number().nullable().default(null),
    cargas: z
      .object({ snatch: CARGA, jerk: CARGA, longCycle: CARGA })
      .default({}),
  })
  .nullable()
  .optional();

const WL = z
  .object({
    escolaMetodologica: z.enum([
      "auto",
      "bulgara",
      "russa_classica",
      "chinesa",
      "cubana",
      "colombiana",
      "pendlay",
      "takano",
    ]),
    nivelAtleta: z.enum(["iniciante", "intermediario", "avancado", "elite"]),
    pesoCorporalKg: z.number().nullable().default(null),
    classificacaoOficial: z.string().max(80).nullable().default(null),
    pontoFracoIdentificado: z
      .enum(["pernas", "costas", "recepcao", "mobilidade_ombro"])
      .nullable()
      .default(null),
    capacidadeRecuperacao: z.enum(["baixa", "media", "alta"]).default("media"),
    suporteTotalDeclarado: z.boolean().default(false),
    cargas: z
      .object({
        arranco: z.object({ cargaKg: z.number().nullable().default(null) }).optional(),
        arremesso: z.object({ cargaKg: z.number().nullable().default(null) }).optional(),
        agachamentoCostas: z
          .object({ cargaKg: z.number().nullable().default(null) })
          .optional(),
        agachamentoFrontal: z
          .object({ cargaKg: z.number().nullable().default(null) })
          .optional(),
      })
      .default({}),
  })
  .nullable()
  .optional();

const TF = z
  .object({
    escolaMetodologica: z.enum([
      "auto",
      "fms_sfma",
      "boyle",
      "exos",
      "dns",
      "crossfit",
      "original_strength",
    ]),
    nivelAtleta: z.enum(["iniciante", "intermediario", "avancado", "elite"]),
    objetivo: z.enum([
      "condicionamento_geral",
      "performance_esportiva",
      "reabilitacao_retorno",
      "emagrecimento",
      "hipertrofia_funcional",
    ]),
    equipamento: z.enum([
      "peso_corporal",
      "academia_completa",
      "kettlebell_halteres",
      "outdoor",
    ]),
    sedentarismoProlongado: z.boolean().default(false),
    lesoes: z
      .array(
        z.object({
          regiao: z.enum([
            "lombar",
            "joelho",
            "ombro",
            "quadril",
            "tornozelo",
            "core",
            "outro",
          ]),
          fase: z.enum(["aguda", "em_recuperacao", "cronica_controlada"]),
          observacaoLivre: z.string().max(300).nullable().default(null),
        }),
      )
      .max(6)
      .default([]),
  })
  .nullable()
  .optional();

const CO = z
  .object({
    escolaMetodologica: z.enum([
      "auto",
      "daniels",
      "lydiard",
      "canova",
      "hansons",
      "pfitzinger",
      "horwill",
      "koop",
    ]),
    nivelAtleta: z.enum(["iniciante", "intermediario", "avancado", "elite"]),
    distanciaAlvo: z.enum(["corrida_rua", "5k", "10k", "21k", "42k", "ultramaratona"]),
    volumeSemanalKm: z.number().nullable().default(null),
    frequenciaSemanalAtual: z.number().nullable().default(null),
    marcaRecenteDistancia: z
      .enum(["corrida_rua", "5k", "10k", "21k", "42k", "ultramaratona"])
      .nullable()
      .default(null),
    marcaRecenteTempo: z.string().max(20).nullable().default(null),
    dataProvaAlvo: z.string().max(20).nullable().default(null),
    terreno: z.enum(["estrada", "trilha", "montanha", "pista"]).nullable().default(null),
    preferenciaAltaFrequencia: z.boolean().default(false),
    lesoes: z
      .array(
        z.object({
          regiao: z.enum([
            "lombar",
            "joelho",
            "ombro",
            "quadril",
            "tornozelo",
            "core",
            "outro",
          ]),
          fase: z.enum(["aguda", "em_recuperacao", "cronica_controlada"]),
          observacaoLivre: z.string().max(300).nullable().default(null),
        }),
      )
      .max(6)
      .default([]),
  })
  .nullable()
  .optional();

const INPUT = z.object({
  programId: z.string().uuid(),
  prompt: z.string().max(4000).default(""),
  diasPorSemana: z.number().int().min(1).max(7).nullable().optional(),
  escopoLabel: z.string().max(80).nullable().optional(),
  kb: KB,
  wl: WL,
  tf: TF,
  co: CO,
  hibrido: z.any().optional(),
});

export const prescribeTrainingWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => INPUT.parse(input))
  .handler(async ({ data, context }): Promise<AiPrescription> => {
    // Motor dedicado: NÃO consulta a tabela `exercises`. Os movimentos vêm
    // exclusivamente do modelo, evitando mistura com outras modalidades.
    const supabase = context.supabase;

    const { data: programa, error } = await supabase
      .from("programs")
      .select(
        "id, titulo, metodologia, descricao, data_inicio, duracao_semanas, program_weeks(numero_semana, sessions(titulo, session_blocks(titulo, session_block_exercises(nome_livre, series, reps, carga_kg))))",
      )
      .eq("id", data.programId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!programa) throw new Error("Programa não encontrado ou sem permissão de acesso");
    const isKbSport = programa.metodologia === "kettlebell_sport";
    const isWl = programa.metodologia === "levantamento_peso";
    const isTf = programa.metodologia === "treinamento_funcional";
    const isCo = programa.metodologia === "corrida";
    if (programa.metodologia !== "musculacao" && programa.metodologia !== "hibrido" && !isKbSport && !isWl && !isTf && !isCo) {
      throw new Error(
        "Prescrever com IA está disponível apenas para Musculação, Híbrido, Kettlebell Sport, Levantamento de Peso, Treinamento Funcional e Corrida",
      );
    }
    if (isKbSport && !data.kb) {
      throw new Error("Configuração do Kettlebell Sport ausente");
    }
    if (isWl && !data.wl) {
      throw new Error("Configuração do Levantamento de Peso ausente");
    }
    if (isTf && !data.tf) {
      throw new Error("Configuração do Treinamento Funcional ausente");
    }
    if (isCo && !data.co) {
      throw new Error("Configuração da Corrida ausente");
    }
    const isHibrido = programa.metodologia === "hibrido" || programa.metodologia === "kettlebell_fitness";
    if (isHibrido && !data.hibrido) {
      throw new Error("Configuração do motor Híbrido/KB Fitness ausente");
    }

    const titulos: (string | null)[] = ((programa as any).program_weeks ?? []).flatMap(
      (w: any) => (w.sessions ?? []).map((s: any) => s.titulo ?? null),
    );
    
    // Constrói resumo do que já foi feito para dar contexto de progressão à IA
    const resumoAnterior = ((programa as any).program_weeks ?? [])
      .sort((a: any, b: any) => a.numero_semana - b.numero_semana)
      .map((w: any) => {
        const treinos = (w.sessions ?? [])
          .map((s: any) => {
            const ex = (s.session_blocks ?? [])
              .flatMap((b: any) => (b.session_block_exercises ?? []))
              .map((e: any) => `${e.nome_livre} (${e.series}x${e.reps}${e.carga_kg ? ` ${e.carga_kg}kg` : ""})`)
              .join(", ");
            return `  - ${s.titulo}: ${ex}`;
          })
          .join("\n");
        return `Semana ${w.numero_semana}:\n${treinos}`;
      })
      .join("\n\n");

    const ctx = {
      titulo: programa.titulo ?? "Programa",
      metodologia: programa.metodologia,
      duracao_semanas: programa.duracao_semanas ?? 1,
      data_inicio: programa.data_inicio ?? null,
      data_fim: calcularDataFim(programa.data_inicio ?? null, programa.duracao_semanas ?? 1),
      nomenclatura: detectarNomenclatura(titulos),
      sessoes_existentes: titulos.length,
      objetivos: programa.descricao ?? null,
      dias_por_semana: data.diasPorSemana ?? null,
      escopo_label: data.escopoLabel ?? null,
      resumo_anterior: resumoAnterior || null,
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento");

    const kb = data.kb ?? null;
    const linha: Exclude<EscolaMetodologica, "auto"> | null = kb
      ? kb.escolaMetodologica === "auto"
        ? escolherEscola(kb.nivelAtleta, kb.disciplina)
        : kb.escolaMetodologica
      : null;

    const wl = data.wl ?? null;
    const linhaWl: Exclude<EscolaWeightlifting, "auto"> | null = wl
      ? wl.escolaMetodologica === "auto"
        ? escolherEscolaWl({
            nivel: wl.nivelAtleta,
            pontoFraco: wl.pontoFracoIdentificado,
            classificacao: wl.classificacaoOficial,
            recuperacao: wl.capacidadeRecuperacao,
            suporteTotal: wl.suporteTotalDeclarado,
          })
        : wl.escolaMetodologica
      : null;

    const tf = data.tf ?? null;
    const linhaTf: Exclude<EscolaFuncional, "auto"> | null = tf
      ? tf.escolaMetodologica === "auto"
        ? escolherEscolaFuncional({
            lesoes: tf.lesoes as any[],
            objetivo: tf.objetivo,
            nivel: tf.nivelAtleta,
            sedentarismoProlongado: tf.sedentarismoProlongado,
          })
        : tf.escolaMetodologica
      : null;

    const co = data.co ?? null;
    const linhaCo: Exclude<EscolaCorrida, "auto"> | null = co
      ? co.escolaMetodologica === "auto"
        ? escolherEscolaCorrida({
            lesoes: co.lesoes as any,
            nivel: co.nivelAtleta,
            distanciaAlvo: co.distanciaAlvo,
            volumeSemanalKm: co.volumeSemanalKm,
            preferenciaAltaFrequencia: co.preferenciaAltaFrequencia,
          })
        : co.escolaMetodologica
      : null;

    const systemPrompt = isKbSport
      ? KB_SPORT_SYSTEM_PROMPT
      : isWl
        ? WL_SYSTEM_PROMPT
        : isTf
          ? TF_SYSTEM_PROMPT
          : isCo
            ? CO_SYSTEM_PROMPT
            : SYSTEM_PROMPT;
    const userPrompt =
      isCo && co && linhaCo
        ? montarCorridaPrompt({
            co: co as any,
            linha: linhaCo,
            semanas: ctx.duracao_semanas,
            diasPorSemana: ctx.dias_por_semana,
            dataInicio: ctx.data_inicio,
            escopoLabel: ctx.escopo_label,
            instrucoes: data.prompt,
          })
        : isTf && tf && linhaTf
        ? montarFuncionalPrompt({
            tf: tf as any,
            linha: linhaTf,
            semanas: ctx.duracao_semanas,
            diasPorSemana: ctx.dias_por_semana,
            dataInicio: ctx.data_inicio,
            escopoLabel: ctx.escopo_label,
            instrucoes: data.prompt,
          })
        : isWl && wl && linhaWl
        ? montarWlPrompt({
            wl: wl as any,
            linha: linhaWl,
            semanas: ctx.duracao_semanas,
            diasPorSemana: ctx.dias_por_semana,
            dataInicio: ctx.data_inicio,
            escopoLabel: ctx.escopo_label,
            instrucoes: data.prompt,
          })
        : isKbSport && kb && linha
        ? montarKbSportPrompt({
            kb: kb as any,
            linha,
            semanas: ctx.duracao_semanas,
            diasPorSemana: ctx.dias_por_semana,
            dataInicio: ctx.data_inicio,
            escopoLabel: ctx.escopo_label,
            instrucoes: data.prompt,
          })
        : isHibrido
        ? montarHibridoPrompt({
            payload: data.hibrido,
            candidatos: await buscarCandidatosDoMolde(supabase, data.hibrido.sessaoTemplate),
            instrucoes: data.prompt,
          })
        : montarUserPrompt(ctx, data.prompt);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error(`AI gateway [${res.status}]: ${corpo}`);
      throw new Error(mensagemDeErroGateway(res.status));
    }

    const payload: any = await res.json();
    const conteudo = payload?.choices?.[0]?.message?.content;
    if (typeof conteudo !== "string" || conteudo.trim().length === 0) {
      throw new Error("A IA não retornou conteúdo. Tente novamente.");
    }

    if (isHibrido) {
      return normalizarPrescricaoHibrido(
        conteudo,
        data.hibrido.sessaoTemplate,
        await buscarCandidatosDoMolde(supabase, data.hibrido.sessaoTemplate)
      ) as any;
    }

    return normalizarPrescricao(conteudo);
  });
