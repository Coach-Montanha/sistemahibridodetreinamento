// Motor de seleção do Kettlebell Fitness — tradução fiel do anexo
// `motor-selecao-kbfitness.ts`, adaptada ao runtime do servidor TanStack.
// Isolado propositalmente: nenhum outro caminho do gerador é afetado.

type Categoria =
  | "Kettlebell"
  | "Ginásticos"
  | "Dumbbell"
  | "Barbell"
  | "Mobilidade"
  | "Objetos Alternativos";

export interface ExercicioPool {
  id: string;
  nome_pt: string;
  categoria: Categoria;
  total_usos: number;
  ultima_sessao_idx: number | null;
}

const PESO_CATEGORIA_KB_FITNESS: Record<Categoria, number> = {
  Kettlebell: 0.813,
  "Ginásticos": 0.15,
  Dumbbell: 0.024,
  Barbell: 0.009,
  Mobilidade: 0.005,
  "Objetos Alternativos": 0,
};

const DISTRIBUICAO_DURACAO: { min: number; peso: number }[] = [
  { min: 30, peso: 0.961 },
  { min: 36, peso: 0.013 },
  { min: 24, peso: 0.011 },
  { min: 20, peso: 0.011 },
  { min: 15, peso: 0.004 },
];

const DISTRIBUICAO_NUM_ESTACOES: { n: number; peso: number }[] = [
  { n: 6, peso: 0.538 },
  { n: 5, peso: 0.368 },
  { n: 4, peso: 0.087 },
  { n: 7, peso: 0.007 },
];

function espacamentoAlvo(totalUsos: number): number {
  if (totalUsos >= 100) return 9;
  if (totalUsos >= 30) return 18;
  if (totalUsos >= 10) return 48;
  return 204;
}

const PROBABILIDADE_ACEITAR_REPETICAO_NO_DIA = 0.157;

export interface SessaoKettlebellFitness {
  duracao_min: number;
  num_estacoes: number;
  estacoes: ExercicioPool[];
}

export function montarSessaoKettlebellFitness(
  pool: ExercicioPool[],
  sessaoIdxAtual: number,
  opts?: {
    categoriasAtivas?: Partial<Record<Categoria, boolean>>;
    numEstacoesOverride?: number | null;
    duracaoMinOverride?: number | null;
  },
): SessaoKettlebellFitness {
  const duracao_min =
    opts?.duracaoMinOverride ??
    sortearPonderado(DISTRIBUICAO_DURACAO.map((d) => ({ item: d.min, peso: d.peso })));
  const num_estacoes =
    opts?.numEstacoesOverride ??
    sortearPonderado(DISTRIBUICAO_NUM_ESTACOES.map((d) => ({ item: d.n, peso: d.peso })));

  // Regra global: Mobilidade só entra em Preparação de Movimento, nunca no motor KB.
  const ativas: Partial<Record<Categoria, boolean>> = {
    ...(opts?.categoriasAtivas ?? {}),
    Mobilidade: false,
  };

  const usadosHoje = new Set<string>();
  const estacoes: ExercicioPool[] = [];

  for (let i = 0; i < num_estacoes; i++) {
    const categoria = sortearCategoria(ativas);
    const permiteRepetir = Math.random() < PROBABILIDADE_ACEITAR_REPETICAO_NO_DIA;
    const escolhido = escolherExercicio(
      pool,
      categoria,
      sessaoIdxAtual,
      permiteRepetir ? new Set() : usadosHoje,
    );
    if (escolhido) {
      estacoes.push(escolhido);
      usadosHoje.add(escolhido.id);
    }
  }

  return { duracao_min, num_estacoes, estacoes };
}

function escolherExercicio(
  pool: ExercicioPool[],
  categoria: Categoria,
  sessaoIdxAtual: number,
  usadosHoje: Set<string>,
): ExercicioPool | null {
  let candidatos = pool.filter((e) => e.categoria === categoria && !usadosHoje.has(e.id));
  // Fallback: se a categoria sorteada não tem estoque, aceita qualquer categoria
  // não usada — sessão não pode ficar com estação vazia por causa de proporção.
  if (candidatos.length === 0) {
    candidatos = pool.filter((e) => !usadosHoje.has(e.id));
  }
  if (candidatos.length === 0) return null;

  const pontuados = candidatos.map((ex) => {
    const alvo = espacamentoAlvo(ex.total_usos);
    const desde =
      ex.ultima_sessao_idx === null ? alvo * 2 : sessaoIdxAtual - ex.ultima_sessao_idx;
    const atraso = desde / alvo;
    return { ex, score: Math.max(atraso, 0.01) };
  });

  return sortearPonderado(pontuados.map((p) => ({ item: p.ex, peso: p.score })));
}

function sortearCategoria(ativas?: Partial<Record<Categoria, boolean>>): Categoria {
  const opcoes = (Object.entries(PESO_CATEGORIA_KB_FITNESS) as [Categoria, number][])
    .filter(([cat, peso]) => peso > 0 && (ativas?.[cat] ?? true))
    .map(([cat, peso]) => ({ item: cat, peso }));
  if (opcoes.length === 0) return "Kettlebell";
  return sortearPonderado(opcoes);
}

function sortearPonderado<T>(opcoes: { item: T; peso: number }[]): T {
  const total = opcoes.reduce((s, o) => s + o.peso, 0);
  let r = Math.random() * total;
  for (const o of opcoes) {
    r -= o.peso;
    if (r <= 0) return o.item;
  }
  return opcoes[opcoes.length - 1].item;
}

// ---------------------------------------------------------------------------
// Adaptador para a nossa base Supabase.
// ---------------------------------------------------------------------------

function mapEquipamentoToCategoria(equipamento: string[] | null | undefined): Categoria {
  const first = Array.isArray(equipamento) && equipamento.length > 0
    ? String(equipamento[0]).toLowerCase().trim()
    : "";
  if (first.includes("kettlebell")) return "Kettlebell";
  if (first.includes("ginast") || first.includes("calist") || first.includes("peso_corporal") || first.includes("peso corporal")) return "Ginásticos";
  if (first.includes("dumbbell") || first.includes("halter")) return "Dumbbell";
  if (first.includes("barbell") || first.includes("barra")) return "Barbell";
  if (first.includes("mobilidade")) return "Mobilidade";
  return "Kettlebell";
}

export async function buildKbFitnessSession(args: {
  supabase: any;
  coachId: string;
  sessionId: string;
  sessaoIdx: number;
  avisos: string[];
  ordemBase?: number;
  config?: {
    categoriasAtivas?: Partial<Record<Categoria, boolean>>;
    numEstacoesOverride?: number | null;
    duracaoMinOverride?: number | null;
  };
}): Promise<void> {
  const { supabase, coachId, sessionId, sessaoIdx, avisos, config } = args;
  const ordemBase = args.ordemBase ?? 0;

  // 1) Pool KB Fitness do coach (+ globais)
  const { data: raw, error: exErr } = await supabase
    .from("exercises")
    .select("id, nome_pt, equipamento, metodologias")
    .or(`coach_id.eq.${coachId},coach_id.is.null`)
    .overlaps("metodologias", ["kettlebell_fitness"]);
  if (exErr) throw new Error(exErr.message);

  const exercicios = (raw ?? []) as Array<{
    id: string;
    nome_pt: string;
    equipamento: string[] | null;
  }>;

  if (exercicios.length === 0) {
    avisos.push(
      `Kettlebell Fitness: nenhum exercício marcado para essa modalidade — sessão criada vazia.`,
    );
    return;
  }

  // 2) Estatísticas de uso por exercício (dentro do coach, modalidade KB Fitness)
  const ids = exercicios.map((e) => e.id);
  const { data: usos } = await supabase
    .from("session_block_exercises")
    .select(
      "exercise_id, session_blocks!inner(sessions!inner(data, program_weeks!inner(programs!inner(coach_id, metodologia))))",
    )
    .in("exercise_id", ids)
    .eq(
      "session_blocks.sessions.program_weeks.programs.coach_id",
      coachId,
    )
    .eq(
      "session_blocks.sessions.program_weeks.programs.metodologia",
      "kettlebell_fitness",
    );

  const stats = new Map<string, { total: number; ultimaData: string | null }>();
  for (const row of (usos ?? []) as any[]) {
    const id = row.exercise_id as string;
    const data: string | undefined = row?.session_blocks?.sessions?.data;
    const cur = stats.get(id) ?? { total: 0, ultimaData: null };
    cur.total += 1;
    if (data && (!cur.ultimaData || data > cur.ultimaData)) cur.ultimaData = data;
    stats.set(id, cur);
  }

  // sessaoIdx é o "agora" — usamos data string do passado como proxy de índice:
  // convertemos ultimaData -> índice relativo simples (dias atrás / 2 ~ sessões).
  // Como sessaoIdx aqui é derivado de (semana-1)*7+dia-1, usamos a data mais
  // recente do coach como ancoragem: sem histórico, fica null.
  const pool: ExercicioPool[] = exercicios
    .map((e) => {
      const s = stats.get(e.id);
      return {
        id: e.id,
        nome_pt: e.nome_pt,
        categoria: mapEquipamentoToCategoria(e.equipamento),
        total_usos: s?.total ?? 0,
        ultima_sessao_idx: s ? Math.max(0, sessaoIdx - s.total) : null,
      };
    })
    // Regra global: exercícios de mobilidade nunca entram em blocos que não sejam
    // Preparação de Movimento — o motor KB monta estações, então filtramos.
    .filter((e) => e.categoria !== "Mobilidade");

  const sessao = montarSessaoKettlebellFitness(pool, sessaoIdx, {
    categoriasAtivas: config?.categoriasAtivas,
    numEstacoesOverride: config?.numEstacoesOverride ?? null,
    duracaoMinOverride: config?.duracaoMinOverride ?? null,
  });

  if (sessao.estacoes.length === 0) {
    avisos.push(`Kettlebell Fitness: pool vazio após filtros — nenhuma estação sorteada.`);
    return;
  }

  // 3) Persistência: 1 único bloco kb_timed_sets + estações
  const { data: block, error: be } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      ordem: ordemBase,
      formato: "kb_timed_sets",
      titulo: `Kettlebell Fitness (${sessao.duracao_min}')`,
      duracao_min: sessao.duracao_min,
      config: {
        formato: "kb_timed_sets",
        template: "kb_fitness",
        num_estacoes: sessao.num_estacoes,
        num_rounds: sessao.num_estacoes,
        duracao_min: sessao.duracao_min,
      },
    })
    .select("id")
    .single();
  if (be || !block) throw new Error(be?.message ?? "Falha ao criar bloco KB Fitness");

  const linhas = sessao.estacoes.map((ex, i) => ({
    session_block_id: block.id,
    exercise_id: ex.id,
    ordem: i,
    series: sessao.num_estacoes,
    reps: "12",
  }));
  const { error: xe } = await supabase.from("session_block_exercises").insert(linhas);
  if (xe) throw new Error(xe.message);
}