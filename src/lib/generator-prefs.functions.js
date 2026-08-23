import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const METODOLOGIA = z.enum([
    "hibrido",
    "kettlebell_sport",
    "kettlebell_fitness",
    "levantamento_peso",
    "musculacao",
    "treinamento_funcional",
    "corrida",
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
    formato: z.string().min(1).max(120), // Widen to support builtin: and custom:
    presetId: z.string().nullable().optional(),
    titulo: z.string().min(1).max(120),
    duracao_min: z.number().int().min(1).max(180).nullable().optional(),
    num_exercicios: z.number().int().min(1).max(20).default(3),
    series: z.number().int().min(1).max(20).nullable().optional(), // Can be null for AMRAP
    seriesMin: z.number().int().min(1).max(20).nullable().optional(),
    seriesMax: z.number().int().min(1).max(20).nullable().optional(),
    reps_base: z.number().int().min(1).max(100).default(10),
    repsPorExercicio: z.union([z.string(), z.number()]).nullable().optional(),
    reps_pattern: z.array(z.number().int().min(1).max(100)).default([]),
    progressao: z.enum(["nenhuma", "piramide_crescente", "piramide_decrescente", "onda"]).default("nenhuma"),
    passos: z.array(PASSO_PCT).default([]),
    tempo_trabalho: z.number().int().min(1).max(600).nullable().optional(),
    tempo_descanso: z.number().int().min(0).max(600).nullable().optional(),
    descansoAposSeg: z.number().int().min(0).max(600).default(0),
    descansoEntreSeriesSeg: z.number().int().min(0).max(600).nullable().optional(),
    intervaloMin: z.number().int().min(1).max(60).nullable().optional(),
    percentual1rm: z.number().int().min(1).max(100).nullable().optional(),
    modoExecucao: z.enum(["circuito", "series_fixas"]).default("circuito"),
    selecaoExercicios: z.enum(["ia", "manual"]).default("ia"),
    exerciciosFixos: z.array(z.string().uuid()).default([]),
    slot: z.enum(["mobilidade", "aquecimento"]).nullable().optional(),
    modalidades_alvo: z.array(z.string()).default([]), // Widen for flexibility
    equipamentos_alvo: z.array(z.string().min(1).max(60)).default([]),
    exercicios_permitidos: z.array(z.string().uuid()).default([]),
    fonteExercicios: z.object({
        metodologias: z.array(z.string()).optional(),
        equipamento: z.array(z.string()).optional(),
    }).default({}),
    // Config exclusiva do motor Kettlebell Fitness
    kb_categorias_ativas: z.record(z.string(), z.boolean()).optional(),
    kb_num_estacoes_override: z.number().int().min(3).max(10).nullable().optional(),
    kb_duracao_min_override: z.number().int().min(10).max(60).nullable().optional(),
    kb_prep_enabled: z.boolean().optional(),
    kb_prep_duracao_min: z.number().int().min(1).max(30).nullable().optional(),
    kb_prep_mobilidade: z.number().int().min(0).max(10).nullable().optional(),
    kb_prep_aquecimento: z.number().int().min(0).max(10).nullable().optional(),
    kb_prep_tempo_seg: z.number().int().min(10).max(180).nullable().optional(),
});
export const getGeneratorPrefs = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((raw) => z.object({ metodologia: METODOLOGIA }).parse(raw))
    .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach)
        throw new Error("Perfil de treinador não encontrado");
    const { data: pref } = await supabase
        .from("generator_preferences")
        .select("blocos")
        .eq("coach_id", coach.id)
        .eq("metodologia", data.metodologia)
        .maybeSingle();
    if (pref?.blocos && Array.isArray(pref.blocos) && pref.blocos.length > 0) {
        return { blocos: pref.blocos, origem: "custom" };
    }
    // Fallback: derivar dos block_templates existentes
    const { data: templates } = await supabase
        .from("block_templates")
        .select("*")
        .eq("metodologia", data.metodologia)
        .or(`coach_id.eq.${coach.id},coach_id.is.null`)
        .eq("ativo", true)
        .order("nome");
    const blocos = (templates ?? []).map((t) => ({
        formato: t.formato,
        presetId: t.config?.presetId ?? `builtin:${t.formato}`,
        titulo: t.nome,
        duracao_min: t.duracao_min ?? null,
        num_exercicios: t.config?.num_exercicios ?? 3,
        series: t.config?.series ?? 3,
        seriesMin: t.config?.seriesMin ?? (t.config?.series ?? 3),
        seriesMax: t.config?.seriesMax ?? (t.config?.series ?? 3),
        reps_base: t.config?.reps_base ?? 10,
        repsPorExercicio: t.config?.repsPorExercicio ?? 10,
        reps_pattern: t.config?.reps_pattern ?? [],
        progressao: t.config?.progressao ?? "nenhuma",
        passos: t.config?.passos ?? [],
        tempo_trabalho: t.config?.tempo_trabalho ?? null,
        tempo_descanso: t.config?.tempo_descanso ?? null,
        descansoAposSeg: t.config?.descansoAposSeg ?? 0,
        descansoEntreSeriesSeg: t.config?.descansoEntreSeriesSeg ?? null,
        intervaloMin: t.config?.intervaloMin ?? null,
        percentual1rm: t.config?.percentual1rm ?? null,
        modoExecucao: t.config?.modoExecucao ?? "circuito",
        selecaoExercicios: t.config?.selecaoExercicios ?? "ia",
        exerciciosFixos: t.config?.exerciciosFixos ?? [],
        slot: t.config?.slot ?? null,
        modalidades_alvo: t.config?.modalidades_alvo ?? [],
        equipamentos_alvo: t.config?.equipamentos_alvo ?? [],
        exercicios_permitidos: t.config?.exercicios_permitidos ?? [],
        fonteExercicios: t.config?.fonteExercicios ?? {},
    }));
    return { blocos, origem: "template" };
});
export const saveGeneratorPrefs = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((raw) => z.object({ metodologia: METODOLOGIA, blocos: z.array(BLOCO) }).parse(raw))
    .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach)
        throw new Error("Perfil de treinador não encontrado");
    const { error } = await supabase
        .from("generator_preferences")
        .upsert({ coach_id: coach.id, metodologia: data.metodologia, blocos: data.blocos }, { onConflict: "coach_id,metodologia" });
    if (error)
        throw new Error(error.message);
    return { ok: true };
});
/** Retorna a lista de equipamentos distintos do banco do coach + globais. */
export const listEquipamentos = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach)
        return [];
    const { data } = await supabase
        .from("exercises")
        .select("equipamento")
        .or(`coach_id.eq.${coach.id},coach_id.is.null`);
    const set = new Set();
    for (const row of data ?? []) {
        const arr = row.equipamento ?? [];
        if (!Array.isArray(arr))
            continue;
        for (const raw of arr) {
            if (!raw)
                continue;
            const norm = String(raw).toLowerCase().trim();
            if (norm)
                set.add(norm);
        }
    }
    return Array.from(set).sort();
});
/** Conta exercícios que casam com filtros (modalidades + equipamentos). */
export const countExercicios = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((raw) => z
    .object({
    modalidades: z.array(METODOLOGIA).min(1),
    equipamentos: z.array(z.string().min(1)).default([]),
})
    .parse(raw))
    .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach)
        return 0;
    const { data: rows } = await supabase
        .from("exercises")
        .select("id, equipamento")
        .or(`coach_id.eq.${coach.id},coach_id.is.null`)
        .overlaps("metodologias", data.modalidades);
    if (data.equipamentos.length === 0)
        return rows?.length ?? 0;
    const alvo = data.equipamentos.map((e) => e.toLowerCase().trim());
    return (rows ?? []).filter((r) => {
        const eq = Array.isArray(r.equipamento) ? r.equipamento : [];
        return eq.some((v) => alvo.includes(String(v).toLowerCase().trim()));
    }).length;
});
/** Lista exercícios do banco do coach para curadoria (com busca + filtros). */
export const searchExercicios = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((raw) => z
    .object({
    query: z.string().max(120).default(""),
    modalidades: z.array(METODOLOGIA).default([]),
    equipamentos: z.array(z.string().min(1)).default([]),
    somente_meus: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(200),
})
    .parse(raw))
    .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: coach } = await supabase.from("coaches").select("id").maybeSingle();
    if (!coach)
        return [];
    let q = supabase
        .from("exercises")
        .select("id, nome_pt, metodologias, equipamento, coach_id")
        .order("nome_pt")
        .limit(data.limit);
    if (data.somente_meus) {
        q = q.eq("coach_id", coach.id);
    }
    else {
        q = q.or(`coach_id.eq.${coach.id},coach_id.is.null`);
    }
    if (data.query.trim()) {
        q = q.ilike("nome_pt", `%${data.query.trim()}%`);
    }
    if (data.modalidades.length > 0) {
        q = q.overlaps("metodologias", data.modalidades);
    }
    const { data: rows, error } = await q;
    if (error)
        throw new Error(error.message);
    let result = (rows ?? []);
    if (data.equipamentos.length > 0) {
        const alvo = data.equipamentos.map((e) => e.toLowerCase().trim());
        result = result.filter((r) => {
            const eq = Array.isArray(r.equipamento) ? r.equipamento : [];
            return eq.some((v) => alvo.includes(String(v).toLowerCase().trim()));
        });
    }
    return result.map((r) => ({
        id: r.id,
        nome_pt: r.nome_pt,
        metodologias: (r.metodologias ?? []),
        equipamento: (r.equipamento ?? []),
    }));
});
/** Busca exercícios por IDs (para hidratar chips de curadoria). */
export const getExerciciosByIds = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((raw) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(raw))
    .handler(async ({ data, context }) => {
    if (data.ids.length === 0)
        return [];
    const supabase = context.supabase;
    const { data: rows, error } = await supabase
        .from("exercises")
        .select("id, nome_pt")
        .in("id", data.ids);
    if (error)
        throw new Error(error.message);
    return (rows ?? []);
});
