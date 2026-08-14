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
  type RotinaContexto,
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
  type SessaoTemplate,
} from "@/lib/hibrido-ia.server";
import { BUILTIN_SET_TYPES, type SetTypePreset } from "@/lib/set-type-registry";

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
  setTypes: z.array(z.any()).optional(),
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
        "id, titulo, metodologia, descricao, data_inicio, duracao_semanas, program_weeks(id, numero_semana)",
      )
      .eq("id", data.programId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!programa) throw new Error("Programa não encontrado ou sem permissão de acesso");
    const isKbSport = programa.metodologia === "kettlebell_sport";
    const isWl = programa.metodologia === "levantamento_peso";
    const isTf = programa.metodologia === "treinamento_funcional";
    const isCo = programa.metodologia === "corrida";
    if (programa.metodologia !== "musculacao" && 
        programa.metodologia !== "hibrido" && 
        programa.metodologia !== "kettlebell_fitness" && 
        !isKbSport && !isWl && !isTf && !isCo) {
      throw new Error(
        "Prescrever com IA está disponível apenas para Musculação, Híbrido, Kettlebell Fitness, Kettlebell Sport, Levantamento de Peso, Treinamento Funcional e Corrida",
      );
    }
    if (isKbSport && !data.kb) {
      throw new Error("Configuração do Kettlebell Sport ausente");
    }
    if (isWl && !data.wl) {
      throw new Error("Configuração do Levantamento de Peso ausente");
    }
    if (isTf && !data.tf) {
      // Se não enviou configuração explícita, usa um fallback básico para não quebrar a chamada
      data.tf = { 
        escolaMetodologica: "auto", 
        nivelAtleta: "intermediario", 
        objetivo: "condicionamento_geral", 
        equipamento: "academia_completa", 
        sedentarismoProlongado: false, 
        lesoes: [] 
      };
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
    
    // Busca o histórico detalhado do programa
    const programWeeks = (programa as any).program_weeks || [];
    const weekIds = programWeeks.map((w: any) => w.id);
    
    let resumoAnterior = null;
    let historicoCompleto: any[] = [];

    if (weekIds.length > 0) {
      // Busca todas as sessões das semanas para extrair blocos e exercícios
      const { data: sessoes } = await supabase
        .from("sessions")
        .select("id, titulo, numero_dia, program_week_id, program_weeks(numero_semana)")
        .in("program_week_id", weekIds)
        .order("created_at", { ascending: true });
      
      const sessaoIds = (sessoes ?? []).map((s: any) => s.id);
      
      if (sessaoIds.length > 0) {
        const { data: blocosSessao } = await supabase
          .from("session_blocks")
          .select("id, session_id, formato, titulo, config")
          .in("session_id", sessaoIds)
          .order("ordem", { ascending: true });
        
        const blocoIds = (blocosSessao ?? []).map((b: any) => b.id);
        
        if (blocoIds.length > 0) {
          const { data: exerciciosPassados } = await supabase
            .from("session_block_exercises")
            .select("session_block_id, nome_livre, series, reps, carga_kg, pct_1rm, descanso_seg, observacoes")
            .in("session_block_id", blocoIds)
            .order("ordem", { ascending: true });

          // Constrói um resumo estruturado para a IA
          historicoCompleto = (sessoes ?? []).map(s => {
            const blocos = (blocosSessao ?? [])
              .filter(b => b.session_id === s.id)
              .map(b => {
                const exercicios = (exerciciosPassados ?? [])
                  .filter(e => e.session_block_id === b.id)
                  .map(e => ({
                    nome: e.nome_livre,
                    sets: e.series,
                    reps: e.reps,
                    carga: e.carga_kg ? `${e.carga_kg}kg` : e.pct_1rm ? `${e.pct_1rm}%` : "Livre",
                    obs: e.observacoes
                  }));
                return { titulo: b.titulo, formato: b.formato, exercicios };
              });
            return {
              semana: (s.program_weeks as any)?.numero_semana,
              dia: s.numero_dia,
              titulo: s.titulo,
              blocos
            };
          });

          const nomesUsados = Array.from(new Set((exerciciosPassados ?? []).map((e: any) => e.nome_livre)));
          resumoAnterior = `HISTÓRICO COMPLETO DO PROGRAMA (use para sobrecarga progressiva e variação):\n` +
            JSON.stringify(historicoCompleto.slice(-15), null, 2) + // Últimas 15 sessões para não estourar contexto
            `\n\nResumo de exercícios já utilizados: ${nomesUsados.join(", ")}`;
        }
      }
    }

    const ctx: RotinaContexto = {
      titulo: programa.titulo ?? "Programa",
      metodologia: programa.metodologia,
      duracao_semanas: data.hibrido?.numeroSessoes && data.diasPorSemana 
        ? Math.ceil(data.hibrido.numeroSessoes / data.diasPorSemana) 
        : (programa.duracao_semanas ?? 1),
      data_inicio: programa.data_inicio ?? null,
      data_fim: calcularDataFim(programa.data_inicio ?? null, programa.duracao_semanas ?? 1),
      nomenclatura: "numerico" as const, // Fallback seguro
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
        ? await (async () => {
            // Busca o histórico expandido (últimas semanas) para contexto de progressão
            const programWeeks = (programa as any).program_weeks || [];
            const sortedWeeks = [...programWeeks].sort((a: any, b: any) => b.numero_semana - a.numero_semana);
            
            const totalSemanasAlvo = data.hibrido?.numeroSessoes && data.diasPorSemana 
              ? Math.ceil(data.hibrido.numeroSessoes / data.diasPorSemana)
              : 1;
            
            const hibridoPayloadComSemanas = {
              ...data.hibrido,
              numeroSessoes: data.hibrido.numeroSessoes,
              diasPorSemana: data.diasPorSemana || 1
            };
            
            // Tenta identificar a última sessão para usar como MOLDE
            const weekIds = sortedWeeks.map((w: any) => w.id);
            const { data: ultimaSessao } = weekIds.length > 0 
              ? await supabase
                  .from("sessions")
                  .select("id, session_blocks(formato, titulo, duracao_min, config, session_block_exercises(exercise_id, series, reps, pct_1rm, descanso_seg))")
                  .in("program_week_id", weekIds)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle()
              : { data: null };

            let molde: SessaoTemplate = (ultimaSessao?.session_blocks ?? []).map((b: any) => ({
              chave: (b.config as any)?.chave || b.titulo || b.formato,
              formato: b.formato as string,
              titulo: b.titulo,
              duracaoMin: b.duracao_min,
              seriesMin: b.session_block_exercises?.[0]?.series || 3,
              seriesMax: b.session_block_exercises?.[0]?.series || 3,
              numeroExercicios: b.session_block_exercises?.length || 1,
              repsPorExercicio: b.session_block_exercises?.[0]?.reps || "10",
              modoExecucao: (b.config as any)?.modo_execucao || "series_fixas",
              descansoAposSeg: (b.config as any)?.descanso_apos_seg || 60,
              selecaoExercicios: "ia",
              fonteExercicios: (b.config as any)?.fonte_exercicios || {}
            }));

            // FALLBACK: Se não houver treino anterior, gera um molde padrão baseado na metodologia
            if (molde.length === 0) {
              if (programa.metodologia === "kettlebell_fitness") {
                molde = [
                  {
                    chave: "prep_mobilidade",
                    formato: "preparacao_movimento",
                    titulo: "Mobilidade",
                    duracaoMin: 2,
                    seriesMin: 1,
                    seriesMax: 1,
                    numeroExercicios: 1,
                    repsPorExercicio: "120s",
                    modoExecucao: "series_fixas",
                    descansoAposSeg: 30,
                    selecaoExercicios: "ia",
                    slot: "mobilidade",
                    fonteExercicios: { equipamento: ["mobilidade"] }
                  },
                  {
                    chave: "aquecimento",
                    formato: "circuito",
                    titulo: "Aquecimento",
                    duracaoMin: 5,
                    seriesMin: 4,
                    seriesMax: 4,
                    numeroExercicios: 2,
                    repsPorExercicio: "10",
                    modoExecucao: "circuito",
                    descansoAposSeg: 60,
                    selecaoExercicios: "ia",
                    fonteExercicios: { equipamento: ["kettlebell", "ginastico"] }
                  },
                  {
                    chave: "bloco_principal",
                    formato: "kb_timed_sets",
                    titulo: "Bloco Principal",
                    duracaoMin: 10,
                    seriesMin: 1,
                    seriesMax: 1,
                    numeroExercicios: 1,
                    repsPorExercicio: "AMRAP",
                    modoExecucao: "series_fixas",
                    descansoAposSeg: 120,
                    selecaoExercicios: "ia",
                    fonteExercicios: { metodologias: ["kettlebell_fitness"], equipamento: ["kettlebell"] }
                  }
                ];
              } else {
                // Híbrido Genérico
                molde = [
                  {
                    chave: "prep",
                    formato: "preparacao_movimento",
                    titulo: "Preparação",
                    duracaoMin: 5,
                    seriesMin: 1,
                    seriesMax: 1,
                    numeroExercicios: 2,
                    repsPorExercicio: "10",
                    modoExecucao: "series_fixas",
                    descansoAposSeg: 30,
                    selecaoExercicios: "ia",
                    fonteExercicios: {}
                  },
                  {
                    chave: "principal",
                    formato: "amrap",
                    titulo: "Fitness A",
                    duracaoMin: 12,
                    seriesMin: 1,
                    seriesMax: 1,
                    numeroExercicios: 3,
                    repsPorExercicio: "10",
                    modoExecucao: "circuito",
                    descansoAposSeg: 120,
                    selecaoExercicios: "ia",
                    fonteExercicios: {}
                  }
                ];
              }
            }

            return montarHibridoPrompt({
              payload: { 
                ...data.hibrido, 
                sessaoTemplate: molde,
                numeroSessoes: data.hibrido.numeroSessoes
              },
              candidatos: await buscarCandidatosDoMolde(supabase, molde),
              instrucoes: data.prompt,
              resumoAnterior: resumoAnterior,
              setTypeRegistry: data.setTypes || BUILTIN_SET_TYPES
            });
          })()
        : montarUserPrompt({ ...ctx, set_types: data.setTypes || BUILTIN_SET_TYPES }, data.prompt);

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
      const programWeeks = (programa as any).program_weeks || [];
      const sortedWeeks = [...programWeeks].sort((a: any, b: any) => b.numero_semana - a.numero_semana);
      const weekId = sortedWeeks[0]?.id;

      const { data: ultimaSessao } = weekId
        ? await supabase
            .from("sessions")
            .select("id, session_blocks(formato, titulo, duracao_min, config, session_block_exercises(exercise_id, series, reps, pct_1rm, descanso_seg))")
            .in("program_week_id", sortedWeeks.map((w: any) => w.id))
            .order("numero_dia", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

      let molde: SessaoTemplate = (ultimaSessao?.session_blocks ?? []).map((b: any) => ({
        chave: (b.config as any)?.chave || b.titulo || b.formato,
        formato: b.formato as string,
        titulo: b.titulo,
        duracaoMin: b.duracao_min,
        seriesMin: b.session_block_exercises?.[0]?.series || 3,
        seriesMax: b.session_block_exercises?.[0]?.series || 3,
        numeroExercicios: b.session_block_exercises?.length || 1,
        repsPorExercicio: b.session_block_exercises?.[0]?.reps || "10",
        modoExecucao: (b.config as any)?.modo_execucao || "series_fixas",
        descansoAposSeg: (b.config as any)?.descanso_apos_seg || 60,
        selecaoExercicios: "ia",
        fonteExercicios: (b.config as any)?.fonte_exercicios || {}
      }));

      // Fallback para normalização se não houver histórico
      if (molde.length === 0) {
        if (programa.metodologia === "kettlebell_fitness") {
          molde = [
            { chave: "prep_mobilidade", formato: "preparacao_movimento", titulo: "Mobilidade", duracaoMin: 2, seriesMin: 1, seriesMax: 1, numeroExercicios: 1, repsPorExercicio: "120s", modoExecucao: "series_fixas", descansoAposSeg: 30, selecaoExercicios: "ia", slot: "mobilidade", fonteExercicios: { equipamento: ["mobilidade"] } },
            { chave: "aquecimento", formato: "circuito", titulo: "Aquecimento", duracaoMin: 5, seriesMin: 4, seriesMax: 4, numeroExercicios: 2, repsPorExercicio: "10", modoExecucao: "circuito", descansoAposSeg: 60, selecaoExercicios: "ia", fonteExercicios: { equipamento: ["kettlebell", "ginastico"] } },
            { chave: "bloco_principal", formato: "kb_timed_sets", titulo: "Bloco Principal", duracaoMin: 10, seriesMin: 1, seriesMax: 1, numeroExercicios: 1, repsPorExercicio: "AMRAP", modoExecucao: "series_fixas", descansoAposSeg: 120, selecaoExercicios: "ia", fonteExercicios: { metodologias: ["kettlebell_fitness"], equipamento: ["kettlebell"] } }
          ];
        } else {
          molde = [
            { chave: "prep", formato: "preparacao_movimento", titulo: "Preparação", duracaoMin: 5, seriesMin: 1, seriesMax: 1, numeroExercicios: 2, repsPorExercicio: "10", modoExecucao: "series_fixas", descansoAposSeg: 30, selecaoExercicios: "ia", fonteExercicios: {} },
            { chave: "principal", formato: "amrap", titulo: "Fitness A", duracaoMin: 12, seriesMin: 1, seriesMax: 1, numeroExercicios: 3, repsPorExercicio: "10", modoExecucao: "circuito", descansoAposSeg: 120, selecaoExercicios: "ia", fonteExercicios: {} }
          ];
        }
      }

      return normalizarPrescricaoHibrido(
        conteudo,
        molde,
        await buscarCandidatosDoMolde(supabase, molde)
      ) as any;
    }

    return normalizarPrescricao(conteudo);
  });
