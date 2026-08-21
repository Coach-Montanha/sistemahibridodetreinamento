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
  semanasNovas: z.number().int().min(1).max(12).default(1),
  metodologiaOverride: z.string().nullable().optional(),
  escolaOverride: z.string().optional(),
  historicoSessoes: z.number().int().min(0).max(12).nullable().optional(),
  cooldownSessoes: z.number().int().min(0).max(8).default(3),
  kb: KB,
  wl: WL,
  tf: TF,
  co: CO,
  hibrido: z.any().optional(),
  setTypes: z.array(z.any()).optional(),
  formatRegistry: z.array(z.any()).optional(),
});

export const prescribeTrainingWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    try {
      return INPUT.parse(input);
    } catch (e: any) {
      console.error("[prescribeTrainingWithAi] Validation Error:", e);
      throw e;
    }
  })
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
    const metodologiaEfetiva = data.metodologiaOverride || programa.metodologia;
    const isKbSport = metodologiaEfetiva === "kettlebell_sport";
    const isWl = metodologiaEfetiva === "levantamento_peso";
    const isTf = metodologiaEfetiva === "treinamento_funcional";
    const isCo = metodologiaEfetiva === "corrida";
    const isHibrido = metodologiaEfetiva === "hibrido" || metodologiaEfetiva === "kettlebell_fitness";

    if (metodologiaEfetiva !== "musculacao" && 
        !isHibrido && 
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
    if (isHibrido && !data.hibrido) {
      throw new Error("Configuração do motor Híbrido/KB Fitness ausente (hibrido payload)");
    }
    
    // Fallback de segurança para molde estrutural se vier vazio na continuidade
    if (isHibrido && data.hibrido && (!data.hibrido.sessaoTemplate || data.hibrido.sessaoTemplate.length === 0)) {
      // Se não enviou molde, tentaremos buscar no histórico abaixo
      console.log("Aviso: Híbrido sem sessaoTemplate. Tentando recuperar do histórico...");
    }

    const titulos: (string | null)[] = ((programa as any).program_weeks ?? []).flatMap(
      (w: any) => (w.sessions ?? []).map((s: any) => s.titulo ?? null),
    );
    
    // Busca o histórico detalhado do programa via buildContinuationContext
    const nHistorico = data.historicoSessoes ?? 6;
    const cooldown = data.cooldownSessoes ?? 3;
    
    const { buildContinuationContext } = await import("./continuation.server");
    const continuation = await buildContinuationContext(
      supabase,
      data.programId,
      nHistorico,
      cooldown
    );

    const ctx: RotinaContexto = {
      titulo: programa.titulo ?? "Programa",
      metodologia: metodologiaEfetiva as string,
      duracao_semanas: data.semanasNovas,
      data_inicio: programa.data_inicio ?? null,
      data_fim: calcularDataFim(programa.data_inicio ?? null, data.semanasNovas),
      nomenclatura: "numerico" as const, // Fallback seguro
      sessoes_existentes: titulos.length,
      objetivos: programa.descricao ?? null,
      dias_por_semana: data.diasPorSemana ?? null,
      escopo_label: data.escopoLabel ?? `${data.semanasNovas} semana(s)`,
      continuation: continuation,
      aluno_info: programa.descricao ?? null,
    };

    // Fallback de histórico legível para prompts que ainda não usam o objeto estruturado
    const resumoAnterior = ctx.continuation 
      ? `CONTEXTO RECENTE: Analisadas ${ctx.continuation.sourceSessionCount} sessões. ` +
        `IDs evitáveis: ${ctx.continuation.softAvoidIds.join(", ")}. ` +
        `Exercícios anteriores: ${ctx.continuation.recentSessions.flatMap(s => s.exerciseNames).slice(-10).join(", ")}`
      : null;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento");

    const kb = data.kb ?? null;
    const linha: Exclude<EscolaMetodologica, "auto"> | null = kb
      ? (data.escolaOverride as any) || (kb.escolaMetodologica === "auto"
        ? escolherEscola(kb.nivelAtleta, kb.disciplina)
        : kb.escolaMetodologica)
      : (metodologiaEfetiva === "kettlebell_sport" ? (data.escolaOverride as any) || "gomonov" : null);

    const wl = data.wl ?? null;
    const linhaWl: Exclude<EscolaWeightlifting, "auto"> | null = wl
      ? (data.escolaOverride as any) || (wl.escolaMetodologica === "auto"
        ? escolherEscolaWl({
            nivel: wl.nivelAtleta,
            pontoFraco: wl.pontoFracoIdentificado,
            classificacao: wl.classificacaoOficial,
            recuperacao: wl.capacidadeRecuperacao,
            suporteTotal: wl.suporteTotalDeclarado,
          })
        : wl.escolaMetodologica)
      : (metodologiaEfetiva === "levantamento_peso" ? (data.escolaOverride as any) || "takano" : null);

    const tf = data.tf ?? null;
    const linhaTf: Exclude<EscolaFuncional, "auto"> | null = tf
      ? (data.escolaOverride as any) || (tf.escolaMetodologica === "auto"
        ? escolherEscolaFuncional({
            lesoes: tf.lesoes as any[],
            objetivo: tf.objetivo,
            nivel: tf.nivelAtleta,
            sedentarismoProlongado: tf.sedentarismoProlongado,
          })
        : tf.escolaMetodologica)
      : (metodologiaEfetiva === "treinamento_funcional" ? (data.escolaOverride as any) || "exos" : null);

    const co = data.co ?? null;
    const linhaCo: Exclude<EscolaCorrida, "auto"> | null = co
      ? (data.escolaOverride as any) || (co.escolaMetodologica === "auto"
        ? escolherEscolaCorrida({
            lesoes: co.lesoes as any,
            nivel: co.nivelAtleta,
            distanciaAlvo: co.distanciaAlvo,
            volumeSemanalKm: co.volumeSemanalKm,
            preferenciaAltaFrequencia: co.preferenciaAltaFrequencia,
          })
        : co.escolaMetodologica)
      : (metodologiaEfetiva === "corrida" ? (data.escolaOverride as any) || "daniels" : null);

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
            resumoAnterior: resumoAnterior, // Adicionado histórico
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
            resumoAnterior: resumoAnterior, // Adicionado histórico
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
            resumoAnterior: resumoAnterior, // Adicionado histórico
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
            resumoAnterior: resumoAnterior, // Adicionado histórico
          })
        : isHibrido
        ? await (async () => {
            const template = data.hibrido.sessaoTemplate?.length > 0 
              ? data.hibrido.sessaoTemplate 
              : continuation.lastSessionStructure 
                ? continuation.lastSessionStructure.map((b: any) => ({
                    chave: b.chave,
                    formato: b.formato,
                    titulo: b.titulo,
                    selecaoExercicios: "ia",
                    numeroExercicios: b.numeroExercicios,
                    fonteExercicios: b.fonteExercicios
                  }))
                : [];
            
            if (!template || template.length === 0) {
              throw new Error("Não foi possível identificar o molde da sessão anterior para continuar a progressão. Verifique se a rotina já possui treinos cadastrados ou configure o molde manualmente.");
            }


            return montarHibridoPrompt({
              payload: { ...data.hibrido, sessaoTemplate: template },
              candidatos: await buscarCandidatosDoMolde(supabase, template),
              instrucoes: data.prompt,
              resumoAnterior: resumoAnterior,
              continuation: continuation,
              setTypeRegistry: data.setTypes || BUILTIN_SET_TYPES,
              customFormats: data.formatRegistry || [],
            });
          })()
        : montarUserPrompt({ ...ctx, set_types: data.setTypes || BUILTIN_SET_TYPES }, data.prompt);

    // Adaptador único do gateway (nada de chamar server functions de dentro de
    // um handler — isso deixava a função fora do manifesto e causava o erro
    // "Server function info not found" no ambiente publicado).
    const { callLovableAiJson, AiGatewayError, resolveAiModel } = await import("@/lib/ai-gateway.server");
    const modelToUse = resolveAiModel();

    const requestId = Math.random().toString(36).substring(7);
    console.log(`[AI_REQUEST][${requestId}] Iniciando geração:`, {
      programId: data.programId,
      metodologia: metodologiaEfetiva,
      semanas: data.semanasNovas,
      model: modelToUse,
      promptChars: systemPrompt.length + userPrompt.length,
    });

    let conteudo: string;
    try {
      const resultadoIa = await callLovableAiJson({
        scope: "prescricao-ia",
        system: systemPrompt,
        prompt: userPrompt,
      });
      conteudo = resultadoIa.raw;
    } catch (err) {
      if (err instanceof AiGatewayError) {
        console.error(`[AI_ERROR][${requestId}] ${err.code} (${err.status})`);
        throw new Error(`${err.code}: ${err.message}`);
      }
      throw err;
    }


    try {
      if (isHibrido) {
        const templateFinal = data.hibrido.sessaoTemplate?.length > 0 
          ? data.hibrido.sessaoTemplate 
          : continuation.lastSessionStructure
            ? continuation.lastSessionStructure.map((b: any) => ({
                chave: b.chave,
                formato: b.formato,
                titulo: b.titulo,
                selecaoExercicios: "ia",
                numeroExercicios: b.numeroExercicios,
                fonteExercicios: b.fonteExercicios
              }))
            : [];

        if (!templateFinal || templateFinal.length === 0) {
           throw new Error("AI_NO_TEMPLATE: O molde da sessão está vazio ou inválido.");
        }

        const result = normalizarPrescricaoHibrido(
          conteudo,
          templateFinal,
          await buscarCandidatosDoMolde(supabase, templateFinal)
        );
        return { ...result, generation_source: "ai" } as any;
      }

      const result = normalizarPrescricao(conteudo);
      return { ...result, generation_source: "ai" } as any;
    } catch (parseErr: any) {
      console.error(`[AI_PARSE_ERROR][${requestId}] Falha ao processar resposta:`, parseErr);
      if (parseErr.message.includes("AI_") || parseErr.message.includes("POOL_VAZIO")) throw parseErr;
      throw new Error(`AI_SCHEMA_MISMATCH: A resposta da IA não pôde ser validada contra o molde. Erro: ${parseErr.message}`);
    }
  });

