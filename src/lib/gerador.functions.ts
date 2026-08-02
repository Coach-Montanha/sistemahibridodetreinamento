import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const JANELA_ANTI_REPETICAO = 3;

const PCT_STEP_PATTERNS = [
  { passos: [{ pct: 50, sets: 3, reps: 6 }, { pct: 60, sets: 2, reps: 5 }, { pct: 70, sets: 1, reps: 4 }] },
  { passos: [{ pct: 40, sets: 1, reps: 20 }, { pct: 50, sets: 1, reps: 16 }, { pct: 60, sets: 1, reps: 18 }] },
];

const inputSchema = z.object({
  program_id: z.string().uuid().optional(),
  metodologia: z.enum([
    "hibrido",
    "kettlebell_sport",
    "kettlebell_fitness",
    "levantamento_peso",
    "musculacao",
  ]),
  titulo: z.string().min(1).default("Programa gerado"),
  escopo: z.enum(["sessao", "semana", "mes", "ano"]),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dias_por_semana: z.number().int().min(1).max(7).default(3),
});

type Input = z.infer<typeof inputSchema>;

export const gerarTreino = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    // Descobrir coach_id do usuário autenticado
    const { data: coach, error: coachErr } = await supabase
      .from("coaches")
      .select("id")
      .maybeSingle();
    if (coachErr || !coach) throw new Error("Perfil de treinador não encontrado");
    const coachId = coach.id;

    // Reutiliza ou cria programa
    let programId = data.program_id;
    if (!programId) {
      const { data: prog, error: pe } = await supabase
        .from("programs")
        .insert({
          coach_id: coachId,
          metodologia: data.metodologia,
          titulo: data.titulo,
          data_inicio: data.data_inicio,
          duracao_semanas: escopoParaSemanas(data.escopo, 4),
        })
        .select("id, metodologia, data_inicio, duracao_semanas")
        .single();
      if (pe || !prog) throw new Error(pe?.message ?? "Falha ao criar programa");
      programId = prog.id;
    }

    const { data: program, error: pgErr } = await supabase
      .from("programs")
      .select("id, metodologia, data_inicio, duracao_semanas")
      .eq("id", programId!)
      .single();
    if (pgErr || !program) throw new Error("Programa não encontrado");

    const totalSemanas = escopoParaSemanas(data.escopo, program.duracao_semanas);
    const feriados = new Set<string>();
    const resultado: { semana: number; sessoes: number; primeira_sessao_id?: string }[] = [];
    let primeiraSessao: string | undefined;
    const avisos: string[] = [];

    for (let numSemana = 1; numSemana <= totalSemanas; numSemana++) {
      const dataInicioSemana = somarSemanas(data.data_inicio, numSemana - 1);

      const { data: existingWeek } = await supabase
        .from("program_weeks")
        .select("id")
        .eq("program_id", program.id)
        .eq("numero_semana", numSemana)
        .maybeSingle();

      let weekId = existingWeek?.id;
      if (!weekId) {
        const { data: wk, error: we } = await supabase
          .from("program_weeks")
          .insert({ program_id: program.id, numero_semana: numSemana, data_inicio: dataInicioSemana })
          .select("id")
          .single();
        if (we || !wk) throw new Error(we?.message ?? "Falha ao criar semana");
        weekId = wk.id;
      }

      const dias = calcularDiasDeTreino(dataInicioSemana, data.dias_por_semana, feriados);
      let count = 0;
      for (const [i, dia] of dias.entries()) {
        const sessId = await gerarSessao(supabase, {
          program_week_id: weekId!,
          numero_dia: i + 1,
          data: dia,
          coach_id: coachId,
          metodologia: program.metodologia,
          avisos,
          contextoSemana: numSemana,
        });
        if (!primeiraSessao) primeiraSessao = sessId;
        count++;
        if (data.escopo === "sessao") break;
      }
      resultado.push({ semana: numSemana, sessoes: count });
      if (data.escopo === "sessao") break;
    }

    // Dedup avisos preservando ordem
    const avisosUnicos = Array.from(new Set(avisos));
    return {
      ok: true,
      program_id: program.id,
      primeira_sessao_id: primeiraSessao,
      resultado,
      avisos: avisosUnicos,
    };
  });

async function gerarSessao(
  supabase: any,
  args: {
    program_week_id: string;
    numero_dia: number;
    data: string;
    coach_id: string;
    metodologia: string;
    avisos: string[];
    contextoSemana: number;
  },
): Promise<string> {
  const { data: session, error: se } = await supabase
    .from("sessions")
    .insert({
      program_week_id: args.program_week_id,
      numero_dia: args.numero_dia,
      data: args.data,
      status: "rascunho",
      gerada_automaticamente: true,
    })
    .select("id")
    .single();
  if (se || !session) {
    console.error("[gerador] falha ao criar sessão", { args, se });
    throw new Error(
      `Falha ao criar sessão: ${se?.message ?? "sem detalhes"}${se?.details ? " — " + se.details : ""}${se?.hint ? " (" + se.hint + ")" : ""}`,
    );
  }

  // Kettlebell Fitness usa motor próprio: 1 bloco único de estações,
  // sorteio por categoria (81/15/2/1/0.5), rounds = nº de estações.
  // Não toca em nenhuma outra modalidade.
  if (args.metodologia === "kettlebell_fitness") {
    // Carrega config opcional do coach para o motor KB (categorias, override de estações/duração)
    const { data: kbPref } = await supabase
      .from("generator_preferences")
      .select("blocos")
      .eq("coach_id", args.coach_id)
      .eq("metodologia", "kettlebell_fitness")
      .maybeSingle();
    const kbBloco = Array.isArray(kbPref?.blocos) && kbPref.blocos.length > 0 ? (kbPref.blocos[0] as any) : null;

    // Preparação de Movimento opcional antes do bloco automático.
    let ordemBase = 0;
    if (kbBloco?.kb_prep_enabled) {
      const nMob = Math.max(0, Number(kbBloco.kb_prep_mobilidade ?? 3));
      const nAq = Math.max(0, Number(kbBloco.kb_prep_aquecimento ?? 2));
      const dur = Number(kbBloco.kb_prep_duracao_min ?? 8);
      const tempoSeg = Number(kbBloco.kb_prep_tempo_seg ?? 30);
      if (nMob + nAq > 0) {
        await inserirPrepMovimento(supabase, {
          sessionId: session.id,
          coachId: args.coach_id,
          ordem: 0,
          duracaoMin: dur,
          numMobilidade: nMob,
          numAquecimento: nAq,
          tempoSeg,
          avisos: args.avisos,
          contextoSemana: args.contextoSemana,
        });
        ordemBase = 1;
      }
    }

    const { buildKbFitnessSession } = await import("@/lib/kbfitness-selector");
    await buildKbFitnessSession({
      supabase,
      coachId: args.coach_id,
      sessionId: session.id,
      sessaoIdx: (args.contextoSemana - 1) * 7 + (args.numero_dia - 1),
      avisos: args.avisos,
      ordemBase,
      config: kbBloco
        ? {
            categoriasAtivas: kbBloco.kb_categorias_ativas ?? undefined,
            numEstacoesOverride: kbBloco.kb_num_estacoes_override ?? null,
            duracaoMinOverride: kbBloco.kb_duracao_min_override ?? null,
          }
        : undefined,
    });
    return session.id;
  }

  // 1) Preferências customizadas do coach para essa metodologia
  const { data: prefRow } = await supabase
    .from("generator_preferences")
    .select("blocos")
    .eq("coach_id", args.coach_id)
    .eq("metodologia", args.metodologia)
    .maybeSingle();

  let blocosPref: any[] | null =
    prefRow?.blocos && Array.isArray(prefRow.blocos) && prefRow.blocos.length > 0
      ? (prefRow.blocos as any[])
      : null;

  // 2) Fallback: block_templates existentes
  if (!blocosPref) {
    const { data: templates } = await supabase
      .from("block_templates")
      .select("*")
      .eq("metodologia", args.metodologia)
      .or(`coach_id.eq.${args.coach_id},coach_id.is.null`)
      .eq("ativo", true);
    blocosPref = (templates ?? []).map((t: any) => ({
      formato: t.formato,
      titulo: t.nome,
      duracao_min: t.duracao_min,
      num_exercicios: t.config?.num_exercicios ?? 3,
      series: t.config?.series ?? 3,
      reps_base: t.config?.reps_base ?? 10,
      reps_pattern: t.config?.reps_pattern ?? [],
      progressao: t.config?.progressao ?? "nenhuma",
      passos: t.config?.passos ?? [],
    }));
  }

  let ordem = 0;
  for (const bloco of blocosPref ?? []) {
    const { data: block, error: be } = await supabase
      .from("session_blocks")
      .insert({
        session_id: session.id,
        ordem: ordem++,
        formato: bloco.formato,
        titulo: bloco.titulo,
        duracao_min: bloco.duracao_min ?? null,
        config: bloco,
      })
      .select("id")
      .single();
    if (be || !block) throw new Error(be?.message ?? "Falha ao criar bloco");

    const quantidade = bloco.num_exercicios ?? 3;
    const modalidadesAlvo: string[] =
      Array.isArray(bloco.modalidades_alvo) && bloco.modalidades_alvo.length > 0
        ? bloco.modalidades_alvo
        : [args.metodologia];
    const equipamentosAlvo: string[] =
      Array.isArray(bloco.equipamentos_alvo) && bloco.equipamentos_alvo.length > 0
        ? bloco.equipamentos_alvo.map((e: string) => e.toLowerCase().trim())
        : [];
    const permitidos: string[] =
      Array.isArray(bloco.exercicios_permitidos)
        ? bloco.exercicios_permitidos.filter((x: any) => typeof x === "string" && x.length > 0)
        : [];

    // Seleção do banco de exercícios do coach, filtrada por modalidades + equipamentos
    const { exercicios, aviso } = await selecionarExercicios(supabase, {
      coach_id: args.coach_id,
      modalidades: modalidadesAlvo,
      equipamentos: equipamentosAlvo,
      formato: bloco.formato,
      quantidade,
      permitidos,
      // Musculação é isolada: nunca cai no banco geral nem aceita
      // movimentos de kettlebell / LPO / ginástico.
      estrito: args.metodologia === "musculacao",
    });
    if (aviso) {
      args.avisos.push(
        `Semana ${args.contextoSemana} · Bloco "${bloco.titulo ?? bloco.formato}": ${aviso}`,
      );
    }

    const passosPct =
      bloco.formato === "forca_tecnica_pct"
        ? bloco.passos && bloco.passos.length
          ? bloco.passos
          : PCT_STEP_PATTERNS[Math.floor(Math.random() * PCT_STEP_PATTERNS.length)].passos
        : null;

    if (exercicios.length) {
      const linhas = exercicios.map((ex: any, i: number) => {
        const base: any = {
          session_block_id: block.id,
          exercise_id: ex.id,
          ordem: i,
        };
        if (passosPct) {
          const p = passosPct[i % passosPct.length];
          base.pct_1rm = p.pct;
          base.series = p.sets;
          base.reps = String(p.reps);
        } else {
          base.series = bloco.series ?? 3;
          base.reps = String(calcReps(bloco, i));
        }
        return base;
      });
      const { error: xe } = await supabase.from("session_block_exercises").insert(linhas);
      if (xe) throw new Error(xe.message);
    }
  }

  return session.id;
}

function calcReps(bloco: any, i: number): number {
  const pattern: number[] = Array.isArray(bloco.reps_pattern) ? bloco.reps_pattern : [];
  if (pattern.length > 0) return pattern[i % pattern.length];
  const base = bloco.reps_base ?? 10;
  const series = Math.max(1, bloco.series ?? 3);
  const step = 2;
  switch (bloco.progressao) {
    case "piramide_crescente":
      return Math.max(1, base - (series - 1) * step + i * step);
    case "piramide_decrescente":
      return Math.max(1, base + (series - 1) * step - i * step);
    case "onda":
      return Math.max(1, base + (i % 2 === 0 ? step : -step));
    default:
      return base;
  }
}

async function selecionarExercicios(
  supabase: any,
  args: {
    coach_id: string;
    modalidades: string[];
    equipamentos: string[];
    formato: string;
    quantidade: number;
    permitidos: string[];
    estrito?: boolean;
  },
): Promise<{ exercicios: any[]; aviso: string | null }> {
  const MODALIDADES_PROIBIDAS = [
    "kettlebell_sport",
    "kettlebell_fitness",
    "kettlebell",
    "levantamento_peso",
    "ginastico",
    "hibrido",
  ];
  const foraDaMusculacao = (e: any): boolean => {
    const mets = Array.isArray(e?.metodologias)
      ? e.metodologias.map((v: any) => String(v).toLowerCase())
      : [];
    if (!mets.includes("musculacao")) return true;
    return mets.some((m: string) => MODALIDADES_PROIBIDAS.includes(m));
  };
  // Regra global: exercícios de mobilidade só podem aparecer no bloco de
  // Preparação de Movimento. Nos demais formatos, removemos qualquer item
  // marcado como Mobilidade (por metodologia OU equipamento).
  const permiteMobilidade = args.formato === "preparacao_movimento";
  const isMobilidade = (e: any): boolean => {
    const mets = Array.isArray(e?.metodologias) ? e.metodologias.map((v: any) => String(v).toLowerCase()) : [];
    const eq = Array.isArray(e?.equipamento) ? e.equipamento.map((v: any) => String(v).toLowerCase()) : [];
    return mets.includes("mobilidade") || eq.includes("mobilidade");
  };

  const { data: recentes } = await supabase
    .from("session_block_exercises")
    .select("exercise_id, session_blocks!inner(formato)")
    .eq("session_blocks.formato", args.formato)
    .limit(args.quantidade * JANELA_ANTI_REPETICAO);
  const idsRecentes = new Set((recentes ?? []).map((r: any) => r.exercise_id).filter(Boolean));

  // Curadoria manual tem precedência total — se o coach escolheu um pool,
  // ignoramos filtros de modalidade/equipamento e sorteamos só desses.
  if (args.permitidos.length > 0) {
    const { data: curated } = await supabase
      .from("exercises")
      .select("id, nome_pt, metodologias, equipamento")
      .in("id", args.permitidos)
      .or(`coach_id.eq.${args.coach_id},coach_id.is.null`);
    let pool = (curated ?? []) as any[];
    if (!permiteMobilidade) pool = pool.filter((e) => !isMobilidade(e));
    if (args.estrito) pool = pool.filter((e) => !foraDaMusculacao(e));
    let aviso: string | null = null;
    if (pool.length === 0) {
      return {
        exercicios: [],
        aviso: `pool curado vazio ou inacessível — nenhum exercício disponível.`,
      };
    }
    if (pool.length < args.quantidade) {
      aviso = `pool curado tem só ${pool.length} de ${args.quantidade} exercícios — considere adicionar mais em Configurações.`;
    }
    const semRepetidos = pool.filter((e: any) => !idsRecentes.has(e.id));
    const finalPool = semRepetidos.length >= args.quantidade ? semRepetidos : pool;
    return { exercicios: embaralhar(finalPool).slice(0, args.quantidade), aviso };
  }

  // Cascata de filtros: modalidade+equipamento → só modalidade → nenhum filtro.
  const { data: base } = await supabase
    .from("exercises")
    .select("id, nome_pt, metodologias, equipamento")
    .or(`coach_id.eq.${args.coach_id},coach_id.is.null`)
    .overlaps("metodologias", args.modalidades);

  const normEquip = (arr: any): string[] =>
    Array.isArray(arr) ? arr.filter(Boolean).map((s: string) => String(s).toLowerCase().trim()) : [];

  const modLabel = args.modalidades.join(" · ");
  const equipLabel = args.equipamentos.join(" · ");

  let candidatos: any[] = base ?? [];
  if (!permiteMobilidade) candidatos = candidatos.filter((e) => !isMobilidade(e));
  if (args.estrito) candidatos = candidatos.filter((e) => !foraDaMusculacao(e));
  let aviso: string | null = null;

  // Filtro por equipamento (case-insensitive), se solicitado.
  if (args.equipamentos.length > 0) {
    const filtrado = candidatos.filter((e: any) => {
      const eq = normEquip(e.equipamento);
      return eq.some((v) => args.equipamentos.includes(v));
    });
    if (filtrado.length >= args.quantidade) {
      candidatos = filtrado;
    } else if (filtrado.length > 0) {
      candidatos = filtrado;
      aviso = `só ${filtrado.length} de ${args.quantidade} exercícios encontrados para ${modLabel} + ${equipLabel} — usei o que tinha.`;
    } else {
      aviso = `nenhum exercício de ${equipLabel} para ${modLabel} — usei a modalidade sem filtro de equipamento.`;
    }
  }

  // Se ainda vazio, cai pra qualquer exercício da conta.
  if (candidatos.length === 0) {
    if (args.estrito) {
      return {
        exercicios: [],
        aviso: `nenhum exercício exclusivo de Musculação${equipLabel ? " (" + equipLabel + ")" : ""} no banco — cadastre movimentos marcados como Musculação.`,
      };
    }
    const { data: fallback } = await supabase
      .from("exercises")
      .select("id, nome_pt, metodologias, equipamento")
      .or(`coach_id.eq.${args.coach_id},coach_id.is.null`)
      .limit(50);
    candidatos = fallback ?? [];
    if (!permiteMobilidade) candidatos = candidatos.filter((e) => !isMobilidade(e));
    if (candidatos.length === 0) {
      return { exercicios: [], aviso: `banco vazio — nenhum exercício disponível para ${modLabel}.` };
    }
    aviso = `nenhum exercício marcado como ${modLabel}${equipLabel ? " + " + equipLabel : ""} — usei o banco geral como fallback.`;
  }

  // Aplica anti-repetição só se restar pool suficiente.
  const semRepetidos = candidatos.filter((e: any) => !idsRecentes.has(e.id));
  const finalPool = semRepetidos.length >= args.quantidade ? semRepetidos : candidatos;

  return {
    exercicios: embaralhar(finalPool).slice(0, args.quantidade),
    aviso,
  };
}

function escopoParaSemanas(escopo: string, fallback: number): number {
  switch (escopo) {
    case "sessao": return 1;
    case "semana": return 1;
    case "mes": return 4;
    case "ano": return 52;
    default: return fallback;
  }
}

function somarSemanas(dataIso: string, semanas: number): string {
  const d = new Date(dataIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + semanas * 7);
  return d.toISOString().slice(0, 10);
}

function calcularDiasDeTreino(dataInicioSemana: string, diasPorSemana: number, feriados: Set<string>): string[] {
  const dias: string[] = [];
  const cursor = new Date(dataInicioSemana + "T00:00:00Z");
  let count = 0;
  let safety = 0;
  while (count < diasPorSemana && safety++ < 30) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!feriados.has(iso)) {
      dias.push(iso);
      count++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

function embaralhar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Insere um bloco de Preparação de Movimento antes do motor automático. */
async function inserirPrepMovimento(
  supabase: any,
  args: {
    sessionId: string;
    coachId: string;
    ordem: number;
    duracaoMin: number;
    numMobilidade: number;
    numAquecimento: number;
    tempoSeg: number;
    avisos: string[];
    contextoSemana: number;
  },
): Promise<void> {
  const { data: pool } = await supabase
    .from("exercises")
    .select("id, nome_pt, metodologias, equipamento")
    .or(`coach_id.eq.${args.coachId},coach_id.is.null`);
  const rows = (pool ?? []) as any[];

  const isMob = (e: any) => {
    const mets = Array.isArray(e?.metodologias) ? e.metodologias.map((v: any) => String(v).toLowerCase()) : [];
    const eq = Array.isArray(e?.equipamento) ? e.equipamento.map((v: any) => String(v).toLowerCase()) : [];
    return mets.includes("mobilidade") || eq.includes("mobilidade");
  };
  const mobPool = rows.filter(isMob);
  const aqPool = rows.filter((e) => !isMob(e));

  const mob = embaralhar(mobPool).slice(0, args.numMobilidade);
  const aq = embaralhar(aqPool).slice(0, args.numAquecimento);

  if (mob.length < args.numMobilidade) {
    args.avisos.push(
      `Semana ${args.contextoSemana} · Preparação de Movimento: só ${mob.length} de ${args.numMobilidade} exercícios de mobilidade disponíveis.`,
    );
  }
  if (aq.length < args.numAquecimento) {
    args.avisos.push(
      `Semana ${args.contextoSemana} · Preparação de Movimento: só ${aq.length} de ${args.numAquecimento} exercícios de aquecimento disponíveis.`,
    );
  }
  if (mob.length + aq.length === 0) return;

  const slots: Record<string, "mobilidade" | "aquecimento"> = {};
  const linhas: any[] = [];
  let idx = 0;
  for (const ex of mob) {
    slots[String(idx)] = "mobilidade";
    linhas.push({
      exercise_id: ex.id,
      ordem: idx,
      series: 1,
      reps: String(args.tempoSeg),
    });
    idx++;
  }
  for (const ex of aq) {
    slots[String(idx)] = "aquecimento";
    linhas.push({
      exercise_id: ex.id,
      ordem: idx,
      series: 2,
      reps: "10",
    });
    idx++;
  }

  const { data: block, error: be } = await supabase
    .from("session_blocks")
    .insert({
      session_id: args.sessionId,
      ordem: args.ordem,
      formato: "preparacao_movimento",
      titulo: `Preparação de Movimento (${args.duracaoMin}')`,
      duracao_min: args.duracaoMin,
      config: {
        formato: "preparacao_movimento",
        duracao_min: args.duracaoMin,
        slots,
      },
    })
    .select("id")
    .single();
  if (be || !block) throw new Error(be?.message ?? "Falha ao criar Preparação de Movimento");

  const { error: xe } = await supabase
    .from("session_block_exercises")
    .insert(linhas.map((l) => ({ ...l, session_block_id: block.id })));
  if (xe) throw new Error(xe.message);
}