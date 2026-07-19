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
        });
        if (!primeiraSessao) primeiraSessao = sessId;
        count++;
        if (data.escopo === "sessao") break;
      }
      resultado.push({ semana: numSemana, sessoes: count });
      if (data.escopo === "sessao") break;
    }

    return { ok: true, program_id: program.id, primeira_sessao_id: primeiraSessao, resultado };
  });

async function gerarSessao(
  supabase: any,
  args: { program_week_id: string; numero_dia: number; data: string; coach_id: string; metodologia: string },
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
    // Seleção do banco de exercícios do coach, filtrada pela metodologia
    const exercicios = await selecionarExercicios(supabase, {
      coach_id: args.coach_id,
      metodologia: args.metodologia,
      formato: bloco.formato,
      quantidade,
    });

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
  args: { coach_id: string; metodologia: string; formato: string; quantidade: number },
) {
  const { data: recentes } = await supabase
    .from("session_block_exercises")
    .select("exercise_id, session_blocks!inner(formato)")
    .eq("session_blocks.formato", args.formato)
    .limit(args.quantidade * JANELA_ANTI_REPETICAO);
  const idsRecentes = new Set((recentes ?? []).map((r: any) => r.exercise_id).filter(Boolean));

  const { data: pool } = await supabase
    .from("exercises")
    .select("id, nome_pt")
    .or(`coach_id.eq.${args.coach_id},coach_id.is.null`)
    .contains("metodologias", [args.metodologia]);

  const disponiveis = (pool ?? []).filter((e: any) => !idsRecentes.has(e.id));
  const candidatos = disponiveis.length >= args.quantidade ? disponiveis : (pool ?? []);
  return embaralhar(candidatos).slice(0, args.quantidade);
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