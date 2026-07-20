import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const METODOLOGIA = z.enum([
  "hibrido",
  "kettlebell_sport",
  "kettlebell_fitness",
  "levantamento_peso",
  "musculacao",
]);

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

const PASSO_PCT = z.object({
  pct: z.number().min(0).max(100),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(50),
});

const BLOCO = z.object({
  formato: FORMATO,
  titulo: z.string().min(1).max(120),
  duracao_min: z.number().int().min(1).max(180).nullable().optional(),
  num_exercicios: z.number().int().min(1).max(20).default(3),
  series: z.number().int().min(1).max(20).default(3),
  reps_base: z.number().int().min(1).max(100).default(10),
  reps_pattern: z.array(z.number().int().min(1).max(100)).default([]),
  progressao: z.enum(["nenhuma", "piramide_crescente", "piramide_decrescente", "onda"]).default("nenhuma"),
  passos: z.array(PASSO_PCT).default([]),
  tempo_trabalho: z.number().int().min(1).max(600).nullable().optional(),
  tempo_descanso: z.number().int().min(0).max(600).nullable().optional(),
  modalidades_alvo: z.array(METODOLOGIA).default([]),
  equipamentos_alvo: z.array(z.string().min(1).max(60)).default([]),
  exercicios_permitidos: z.array(z.string().uuid()).default([]),
});

export type BlocoPref = z.infer<typeof BLOCO>;

export const getGeneratorPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ metodologia: METODOLOGIA }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach) throw new Error("Perfil de treinador não encontrado");

    const { data: pref } = await supabase
      .from("generator_preferences")
      .select("blocos")
      .eq("coach_id", coach.id)
      .eq("metodologia", data.metodologia)
      .maybeSingle();

    if (pref?.blocos && Array.isArray(pref.blocos) && pref.blocos.length > 0) {
      return { blocos: pref.blocos as BlocoPref[], origem: "custom" as const };
    }

    // Fallback: derivar dos block_templates existentes
    const { data: templates } = await supabase
      .from("block_templates")
      .select("*")
      .eq("metodologia", data.metodologia)
      .or(`coach_id.eq.${coach.id},coach_id.is.null`)
      .eq("ativo", true)
      .order("nome");

    const blocos: BlocoPref[] = (templates ?? []).map((t: any) => ({
      formato: t.formato,
      titulo: t.nome,
      duracao_min: t.duracao_min ?? null,
      num_exercicios: t.config?.num_exercicios ?? 3,
      series: t.config?.series ?? 3,
      reps_base: t.config?.reps_base ?? 10,
      reps_pattern: t.config?.reps_pattern ?? [],
      progressao: t.config?.progressao ?? "nenhuma",
      passos: t.config?.passos ?? [],
      tempo_trabalho: t.config?.tempo_trabalho ?? null,
      tempo_descanso: t.config?.tempo_descanso ?? null,
      modalidades_alvo: t.config?.modalidades_alvo ?? [],
      equipamentos_alvo: t.config?.equipamentos_alvo ?? [],
      exercicios_permitidos: t.config?.exercicios_permitidos ?? [],
    }));

    return { blocos, origem: "template" as const };
  });

export const saveGeneratorPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ metodologia: METODOLOGIA, blocos: z.array(BLOCO) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach) throw new Error("Perfil de treinador não encontrado");

    const { error } = await supabase
      .from("generator_preferences")
      .upsert(
        { coach_id: coach.id, metodologia: data.metodologia, blocos: data.blocos },
        { onConflict: "coach_id,metodologia" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Retorna a lista de equipamentos distintos do banco do coach + globais. */
export const listEquipamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach) return [] as string[];

    const { data } = await supabase
      .from("exercises")
      .select("equipamento")
      .or(`coach_id.eq.${coach.id},coach_id.is.null`);

    const set = new Set<string>();
    for (const row of data ?? []) {
      const arr = (row as any).equipamento ?? [];
      if (!Array.isArray(arr)) continue;
      for (const raw of arr) {
        if (!raw) continue;
        const norm = String(raw).toLowerCase().trim();
        if (norm) set.add(norm);
      }
    }
    return Array.from(set).sort();
  });

/** Conta exercícios que casam com filtros (modalidades + equipamentos). */
export const countExercicios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        modalidades: z.array(METODOLOGIA).min(1),
        equipamentos: z.array(z.string().min(1)).default([]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach) return 0;

    const { data: rows } = await supabase
      .from("exercises")
      .select("id, equipamento")
      .or(`coach_id.eq.${coach.id},coach_id.is.null`)
      .overlaps("metodologias", data.modalidades);

    if (data.equipamentos.length === 0) return rows?.length ?? 0;
    const alvo = data.equipamentos.map((e) => e.toLowerCase().trim());
    return (rows ?? []).filter((r: any) => {
      const eq = Array.isArray(r.equipamento) ? r.equipamento : [];
      return eq.some((v: any) => alvo.includes(String(v).toLowerCase().trim()));
    }).length;
  });