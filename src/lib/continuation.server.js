export async function buildContinuationContext(supabase, programId, nHistory, cooldown = 3) {
    const { data: weeks } = await supabase
        .from("program_weeks")
        .select("id, numero_semana")
        .eq("program_id", programId)
        .order("numero_semana", { ascending: true });
    const weekIds = (weeks ?? []).map((w) => w.id);
    const lastWeekNumber = weeks?.length ? weeks[weeks.length - 1].numero_semana : 0;
    if (weekIds.length === 0 || nHistory === 0) {
        return {
            version: 1,
            programId,
            sourceSessionCount: 0,
            lastWeekNumber,
            recentSessions: [],
            usage: [],
            hardExcludeIds: [],
            softAvoidIds: [],
            recentFormats: [],
            lastSessionStructure: null,
            progressionNotes: "Início de nova fase sem histórico prévio analisado."
        };
    }
    const { data: sessoes } = await supabase
        .from("sessions")
        .select("id, titulo, numero_dia, program_week_id, program_weeks(numero_semana)")
        .in("program_week_id", weekIds)
        .order("created_at", { ascending: false })
        .limit(nHistory);
    if (!sessoes || sessoes.length === 0) {
        return {
            version: 1,
            programId,
            sourceSessionCount: 0,
            lastWeekNumber,
            recentSessions: [],
            usage: [],
            hardExcludeIds: [],
            softAvoidIds: [],
            recentFormats: [],
            lastSessionStructure: null,
            progressionNotes: "Nenhuma sessão encontrada no histórico."
        };
    }
    const sessaoIds = sessoes.map((s) => s.id);
    const { data: blocos } = await supabase
        .from("session_blocks")
        .select("id, session_id, formato, titulo, ordem, config")
        .in("session_id", sessaoIds)
        .order("ordem", { ascending: true });
    const blocoIds = (blocos ?? []).map((b) => b.id);
    const { data: exercicios } = await supabase
        .from("session_block_exercises")
        .select(`
      session_block_id, 
      nome_livre, 
      exercise_id,
      exercises(id, nome_pt, grupo_muscular)
    `)
        .in("session_block_id", blocoIds)
        .order("ordem", { ascending: true });
    const sessionData = sessoes.reverse().map((s) => {
        const sBlocos = (blocos ?? []).filter(b => b.session_id === s.id);
        const sExs = (exercicios ?? []).filter(e => sBlocos.some(b => b.id === e.session_block_id));
        return {
            week: s.program_weeks?.numero_semana || 0,
            day: s.numero_dia || 0,
            title: s.titulo,
            exerciseNames: sExs.map(e => e.nome_livre || e.exercises?.nome_pt).filter(Boolean),
            muscleGroups: sExs.map(e => e.exercises?.grupo_muscular).filter(Boolean)
        };
    });
    const lastSessao = sessoes[0];
    const lastBlocos = (blocos ?? [])
        .filter(b => b.session_id === lastSessao.id)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const lastSessionStructure = lastBlocos.map(b => {
        const bExs = (exercicios ?? []).filter(e => e.session_block_id === b.id);
        const config = b.config;
        return {
            titulo: b.titulo,
            formato: b.formato,
            chave: config?.chave || b.id,
            numeroExercicios: bExs.length || 1,
            fonteExercicios: config?.fonteExercicios || { metodologias: [] }
        };
    });
    const usageMap = new Map();
    exercicios?.forEach((e) => {
        const id = e.exercise_id || e.nome_livre;
        if (!id)
            return;
        const name = e.nome_livre || e.exercises?.nome_pt || "Exercício";
        const current = usageMap.get(id) || { id, name, count: 0, lastIdx: -1 };
        const sIdx = sessoes.findIndex(s => (blocos ?? []).some(b => b.id === e.session_block_id && b.session_id === s.id));
        usageMap.set(id, {
            id,
            name,
            count: current.count + 1,
            lastIdx: Math.max(current.lastIdx, sIdx)
        });
    });
    const usage = Array.from(usageMap.values())
        .map(u => ({ exerciseId: u.id, name: u.name, count: u.count, lastSeenSessionIdx: u.lastIdx }))
        .sort((a, b) => b.count - a.count);
    const softAvoidIds = usage
        .filter(u => (sessoes.length - 1 - u.lastSeenSessionIdx) < cooldown)
        .map(u => u.exerciseId);
    const recentFormats = Array.from(new Set((blocos ?? []).map(b => b.formato))).slice(0, 10);
    return {
        version: 1,
        programId,
        sourceSessionCount: sessoes.length,
        lastWeekNumber,
        recentSessions: sessionData,
        usage,
        hardExcludeIds: [],
        softAvoidIds,
        recentFormats,
        lastSessionStructure,
        progressionNotes: `Analisadas ${sessoes.length} sessões. Foco em evitar repetições das últimas ${cooldown} sessões e manter progressão ondulatória.`
    };
}
