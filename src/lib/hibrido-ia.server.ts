/**
 * Motor de geração para Treinamento Híbrido — e, pela mesma estrutura,
 * Kettlebell Fitness.
 *
 * Diferente dos motores de KB Sport / Weightlifting / Funcional / Corrida,
 * aqui a IA NÃO inventa a sessão nem os nomes dos exercícios. O usuário
 * constrói de antemão o "molde" estrutural (SessaoTemplate: uma lista
 * sequencial de blocos, cada um com formato, duração, séries, número de
 * exercícios, reps e descanso já travados) e a IA tem uma tarefa muito mais
 * estreita: para cada bloco marcado como seleção "ia", escolher os IDs de
 * exercícios reais da biblioteca (tabela `exercises`) que preenchem aquele
 * bloco — nunca inventar nomes, nunca inventar IDs.
 *
 * Fluxo pretendido:
 *   1. Usuário monta o SessaoTemplate na tela de construção (fora deste
 *      arquivo).
 *   2. Para cada bloco do molde, buscarCandidatosDoBloco() consulta a
 *      tabela `exercises` filtrando por `fonteExercicios` (metodologias,
 *      equipamento) e devolve um pool de candidatos (id + nome).
 *   3. montarHibridoPrompt() monta o prompt único cobrindo TODAS as sessões
 *      da sequência de uma vez, injetando o molde + os pools de candidatos
 *      por bloco.
 *   4. O gateway de IA responde só com os IDs escolhidos por bloco/sessão.
 *   5. normalizarPrescricaoHibrido() valida cada ID retornado contra o pool
 *      permitido daquele bloco — descarta e substitui por fallback qualquer
 *      ID que a IA tenha alucinado.
 *
 * NOTA: o filtro `fonteExercicios` hoje só cobre `metodologias` e
 * `equipamento`, porque foram as únicas colunas estruturadas confirmadas na
 * tabela `exercises` até agora. Se existirem colunas como padrão de
 * movimento, sistema energético ou nível, adicione aqui e no filtro SQL.
 */

export type ModalidadeHibrida = "hibrido" | "kettlebell_fitness";

/** Mesmo vocabulário do BlockFormat já usado em session-builder/BlockFormats.tsx. */
export type BlockFormatHibrido = string;

export function resolveBaseFormat(formatId: string): string {
  if (formatId.startsWith("builtin:")) return formatId.replace("builtin:", "");
  if (formatId.startsWith("custom:")) return formatId; // Will need lookup if custom formats have different base
  return formatId;
}


export type ModoExecucao = "circuito" | "series_fixas";
export type SlotPreparacao = "mobilidade" | "aquecimento";
export type SelecaoExercicios = "ia" | "manual";

export type FonteExercicios = {
  metodologias?: string[];
  equipamento?: string[];
};

export type BlocoTemplate = {
  /** Identificador estável do bloco dentro do molde (ex.: "prep", "aquecimento", "fitness_a"). */
  chave: string;
  formato: BlockFormatHibrido;
  titulo?: string | null;
  /** Teto de tempo do bloco, em minutos. Para emom/e2mom, é o total (rounds × intervaloMin). */
  duracaoMin: number | null;
  /** Faixa de séries/rounds — se fixo, seriesMin === seriesMax. Irrelevante para amrap. */
  seriesMin: number | null;
  seriesMax: number | null;
  numeroExercicios: number;
  /** "12", "8-12", ou número. */
  repsPorExercicio: string | number | null;
  modoExecucao: ModoExecucao;
  /** Descanso DEPOIS deste bloco, antes do próximo bloco da sessão, em segundos. */
  descansoAposSeg: number;
  /** Descanso DENTRO do bloco, entre séries/rounds (ex.: SetsRepsForm.descanso_seg). Irrelevante para emom/e2mom/amrap (o próprio formato define o ritmo). */
  descansoEntreSeriesSeg?: number | null;
  /** Só para emom/e2mom: minutos de cada ciclo (1 para emom, 2 para e2mom, mas editável). */
  intervaloMin?: number | null;
  /** Só para forca_tecnica_pct: percentual de 1RM do passo único deste bloco. */
  percentual1rm?: number | null;
  selecaoExercicios: SelecaoExercicios;
  /** IDs de exercícios já escolhidos manualmente — usado quando selecaoExercicios === "manual". */
  exerciciosFixos?: string[];
  /** Só relevante para preparacao_movimento. */
  slot?: SlotPreparacao | null;
  fonteExercicios: FonteExercicios;
};

export type SessaoTemplate = BlocoTemplate[];

export type HibridoPayload = {
  modalidade: ModalidadeHibrida;
  tituloPrograma: string;
  /** Quantas sessões em sequência gerar usando o mesmo molde. */
  numeroSessoes: number;
  diasPorSemana: number;
  dataInicio: string | null | undefined;
  sessaoTemplate: SessaoTemplate;
  escola?: string | null;
  /** Histórico de sessões para escolha de molde (opcional, usado no frontend). */
  historicoSessoes?: { id: string; titulo: string; blocks: BlocoTemplate[] }[];
};


export type ExercicioCandidato = { id: string; nome: string };

/** Rótulos canônicos gravados em `exercises.equipamento`. */
export const EQUIPAMENTOS_CANONICOS = [
  "Kettlebell",
  "Ginásticos",
  "Dumbbell",
  "Barbell",
  "Mobilidade",
  "Alternativos Musculação",
  "Objetos Alternativos",
] as const;

function chaveEquip(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Converte qualquer variação (caixa/acento) para o rótulo canônico do banco. */
export function normalizarEquipamento(valor: string): string | null {
  const k = chaveEquip(valor);
  const achado = EQUIPAMENTOS_CANONICOS.find((c) => chaveEquip(c) === k);
  if (achado) return achado;
  if (k === "ginastico" || k === "ginasticos") return "Ginásticos";
  if (["cable", "machine", "plate"].includes(k)) return "Alternativos Musculação";
  return null;
}

/** Pool de candidatos por bloco (chave do BlocoTemplate → lista de candidatos). */
export type CandidatosPorBloco = Record<string, ExercicioCandidato[]>;

/**
 * Busca, para cada bloco do molde com seleção "ia", o pool de exercícios
 * candidatos na tabela `exercises`, filtrando por fonteExercicios.
 * Recebe o client Supabase já autenticado (context.supabase no server function).
 */
export async function buscarCandidatosDoMolde(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  template: SessaoTemplate,
): Promise<CandidatosPorBloco> {
  const out: CandidatosPorBloco = {};

  for (const bloco of template) {
    if (bloco.selecaoExercicios !== "ia") continue;

    let query = supabase.from("exercises").select("id, nome_pt").order("nome_pt").limit(60);

    // Regras de conexão Bloco -> Equipamento (e Metodologia quando implícito)
    const metodologias = [...(bloco.fonteExercicios.metodologias ?? [])];
    const equipamentos = [...(bloco.fonteExercicios.equipamento ?? [])];

    const formatBase = resolveBaseFormat(bloco.formato);
    if (formatBase === "preparacao_movimento" || formatBase === "mobilidade") {

      if (bloco.slot === "mobilidade") {
        // Bloco de mobilidade só consegue solicitar e selecionar movimentos do equipamento mobilidade.
        equipamentos.push("Mobilidade");
      }
    } else if (bloco.titulo?.toLowerCase() === "aquecimento" || bloco.chave.includes("aquecimento")) {
      // Bloco de aquecimento só consegue solicitar e selecionar movimentos do bloco kettlebell e ginástico.
      equipamentos.push("Kettlebell", "Ginásticos");
    }

    // Os valores gravados em `exercises.equipamento` são rótulos canônicos
    // ("Kettlebell", "Ginásticos", ...). `overlaps` é sensível a caixa/acento,
    // então normalizamos o que vier do molde antes de filtrar.
    const equipamentosNormalizados = Array.from(
      new Set(equipamentos.map((e) => normalizarEquipamento(e)).filter(Boolean) as string[]),
    );

    if (metodologias.length > 0) {
      query = query.overlaps("metodologias", metodologias);
    }
    if (equipamentosNormalizados.length > 0) {
      query = query.overlaps("equipamento", equipamentosNormalizados);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao buscar exercícios para o bloco "${bloco.chave}": ${error.message}`);

    const dataArr = data ?? [];
    if (bloco.selecaoExercicios === "ia" && dataArr.length === 0) {
      const equipDesc =
        equipamentosNormalizados.length > 0
          ? `equipamento [${equipamentosNormalizados.join(", ")}]`
          : "nenhum equipamento";
      const metDesc = metodologias.length > 0 ? `metodologia [${metodologias.join(", ")}]` : "nenhuma metodologia";
      throw new Error(`A IA não retornou nenhuma sessão estruturada. Verifique se o pool de exercícios da biblioteca atende aos filtros de ${equipDesc} e ${metDesc} do molde "${bloco.titulo ?? bloco.chave}".`);
    }

    out[bloco.chave] = dataArr.map((e: any) => ({ id: e.id as string, nome: e.nome_pt as string }));
  }

  return out;
}

const LABEL_MODALIDADE: Record<ModalidadeHibrida, string> = {
  hibrido: "Treinamento Híbrido",
  kettlebell_fitness: "Kettlebell Fitness",
};

const FILOSOFIA_HIBRIDO = `Filosofia do Treinamento Híbrido: os movimentos somam padrões simples e compostos, executados de forma isolada ou integrada, buscando os três planos de movimento (sagital, frontal, transversal) — tridimensionalidade, não repetição plana. Os três sistemas energéticos (ATP-CP, glicolítico, oxidativo) são estimulados em conjunto sempre que possível dentro da mesma sessão. Exercícios ginásticos (peso corporal), exercícios com sobrecarga externa (kettlebell, halteres, barra) e exercícios cíclicos (corda, bike, remo) se combinam — não são tratados como categorias isoladas.`;

const FILOSOFIA_KETTLEBELL_FITNESS = `Filosofia do Kettlebell Fitness: sessões centradas quase exclusivamente em kettlebell e ginástico, priorizando fluência de movimento e densidade.
A estrutura de Kettlebell Fitness deve seguir rigorosamente:
1. Mobilidade: selecionar 1 movimento do equipamento Mobilidade (duração 2').
2. Aquecimento: selecionar 2-3 movimentos do equipamento ginástico e kettlebell (circuito, 5', 4 séries).
3. Bloco Principal Kettlebell Fitness: a seleção deve ser de 90% a 100% de exercícios com equipamento kettlebell e de 0% a 10% de movimentos com equipamento ginástico.`;

/**
 * Monta o prompt único cobrindo toda a sequência de sessões.
 * A IA só precisa devolver, por sessão e por bloco (chave), a lista de IDs
 * escolhidos — nunca a estrutura do bloco em si, que já está definida.
 */
export function montarHibridoPrompt(args: {
  payload: HibridoPayload;
  candidatos: CandidatosPorBloco;
  instrucoes: string;
  resumoAnterior?: string | null;
  continuation?: import("./continuation.server").ContinuationContext | null;
  setTypeRegistry?: any[];
  customFormats?: any[];
}): string {
  const { payload, candidatos, instrucoes, resumoAnterior, continuation, setTypeRegistry, customFormats } = args;

  const filosofia =
    payload.modalidade === "kettlebell_fitness" ? FILOSOFIA_KETTLEBELL_FITNESS : FILOSOFIA_HIBRIDO;

  const historySection = continuation 
    ? [
        "RESUMO ESTRUTURADO DO HISTÓRICO RECENTE (Para Progressão):",
        `- Sessões analisadas: ${continuation.sourceSessionCount}`,
        `- Exercícios recentes: ${continuation.recentSessions.flatMap(s => s.exerciseNames).join(", ")}`,
        `- BLOQUEIO DE REPETIÇÃO (Soft Avoid): Tente NÃO utilizar estes IDs se possível: ${continuation.softAvoidIds.join(", ")}`,
        `- Exercícios frequentes: ${continuation.usage.slice(0, 5).map(u => u.name).join(", ")}`,
        `- Formatos recentes: ${continuation.recentFormats.join(", ")}`,
        `- NOTAS DE PROGRESSÃO: ${continuation.progressionNotes}`,
      ].join("\n")
    : resumoAnterior;

  const blocosDescricao = payload.sessaoTemplate.map((b) => {
    const pool = candidatos[b.chave] ?? [];
    return {
      chave: b.chave,
      formato: b.formato,
      titulo: b.titulo ?? null,
      duracao_min: b.duracaoMin,
      series: b.seriesMin === b.seriesMax ? b.seriesMin : { min: b.seriesMin, max: b.seriesMax },
      numero_exercicios: b.numeroExercicios,
      reps_por_exercicio: b.repsPorExercicio,
      modo_execucao: b.modoExecucao,
      descanso_apos_seg: b.descansoAposSeg,
      selecao_exercicios: b.selecaoExercicios,
      // Se manual, a IA não escolhe nada — só ecoa os IDs fixos.
      exercicios_fixos: b.selecaoExercicios === "manual" ? (b.exerciciosFixos ?? []) : undefined,
      // Se IA, aqui está o único conjunto de onde ela pode escolher.
      candidatos_permitidos:
        b.selecaoExercicios === "ia" ? pool.map((c) => ({ id: c.id, nome: c.nome })) : undefined,
    };
  });

  return [
    `Você é um treinador especialista em ${LABEL_MODALIDADE[payload.modalidade]}.`,
    filosofia,
    payload.escola ? `ESCOLA METODOLÓGICA SELECIONADA: ${payload.escola}. Adapte a seleção de exercícios e nomenclaturas a este estilo.` : "",
    "",
    `SUA TAREFA É EVOLUIR A PROGRAMAÇÃO (CONTINUAR GERANDO EM BLOCO):`,
    `A estrutura de cada bloco JÁ ESTÁ DEFINIDA e não deve ser alterada. Sua liberdade está em escolher exercícios, séries, repetições e cargas.`,
    `Você deve analisar o HISTÓRICO COMPLETO abaixo para projetar a sobrecarga progressiva e PERIODIZAÇÃO ONDULATÓRIA.`,
    `VOCÊ TEM LIBERDADE TOTAL PARA ALTERAR ENTRE AS SEMANAS:`,
    `- TROCA OBRIGATÓRIA: Você DEVE escolher NOVOS exercícios (do pool de candidatos) para variar o estímulo técnico em relação à fase anterior. Se o histórico mostrar um exercício X, tente não repetí-lo se houver outras opções viáveis no pool. Priorize a diversidade técnica.`,
    `- Variar o número de exercícios, séries e repetições de forma não linear entre as sessões/semanas.`,
    `- Aumentar intensidades de forma estratégica (ex: Semana 1 base, Semana 2 volume, Semana 3 intensidade, Semana 4 recuperação).`,
    `- OBRIGATÓRIO: Identifique corretamente o "week_number" (1, 2, 3...) para cada sessão gerada.`,
    "",
    `REGRAS DE SELEÇÃO:`,
    `- Apenas IDs listados em "candidatos_permitidos" para blocos "ia".`,
    `- NUNCA invente um ID ou nome de exercício.`,
    `- Blocos "manual" devem ter seus "exercicios_fixos" repetidos fielmente.`,
    `- Gere ${payload.numeroSessoes} sessão(ões) que expandam logicamente o programa anterior, mas com NOVOS exercícios.`,
    "",
    setTypeRegistry ? `TIPOS DE SÉRIES DISPONÍVEIS: ${setTypeRegistry.map(t => `${t.label} (ID: ${t.id})`).join(" | ")}` : "",
    customFormats && customFormats.length > 0 ? `FORMATOS DE BLOCO CUSTOMIZADOS DISPONÍVEIS: ${customFormats.map((f: any) => `${f.label} (ID: ${f.id})`).join(" | ")}` : "",
    historySection ? `\nCONTEXTO DO PROGRAMA (HISTÓRICO E PROGRESSÃO):\n${historySection}` : "",
    "",
    "Molde estrutural:",
    JSON.stringify(blocosDescricao, null, 2),
    "",
    "INSTRUÇÕES DO TREINADOR:",
    instrucoes.trim().length > 0 ? instrucoes.trim() : "Evolua o treino de forma equilibrada.",
    "",
    `Responda APENAS em JSON válido no campo "notes" escreva um "RELATÓRIO DE EVOLUÇÃO" detalhando o que foi mudado em relação ao histórico:`,
    JSON.stringify(
      {
        sessoes: [
          {
            blocos: [{ chave: "<chave_do_bloco>", exercicios_ids: ["<id1>", "<id2>"] }],
          },
        ],
        notes: "RELATÓRIO DE EVOLUÇÃO: Descreva as progressões de carga e trocas de exercícios realizadas.",
      },
      null,
      2,
    ),
  ].join("\n");
}

export type PrescricaoHibridoBloco = { chave: string; exerciciosIds: string[] };
export type PrescricaoHibridoSessao = { blocos: PrescricaoHibridoBloco[] };
export type PrescricaoHibrido = { sessoes: PrescricaoHibridoSessao[]; notes: string };

/**
 * Parsing defensivo (mesmo padrão de normalizarPrescricao) + validação de
 * segurança: todo ID retornado precisa pertencer ao pool de candidatos do
 * bloco correspondente. IDs alucinados são descartados; blocos que ficarem
 * com menos exercícios que numeroExercicios são completados com os
 * primeiros candidatos do pool ainda não usados nessa sessão, para nunca
 * devolver um bloco vazio.
 */
export function normalizarPrescricaoHibrido(
  bruto: string,
  template: SessaoTemplate,
  candidatos: CandidatosPorBloco,
): PrescricaoHibrido {
  let json: any;
  try {
    const limpo = bruto
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    json = JSON.parse(limpo);
  } catch {
    throw new Error("A IA respondeu em um formato inesperado. Tente novamente.");
  }

  const sessoesRaw = Array.isArray(json?.sessoes) ? json.sessoes : [];
  if (sessoesRaw.length === 0) {
      console.error("HibridoIA: IA retornou JSON sem o campo 'sessoes' ou array vazio.", {
        bruto,
        json
      });
      if (template.length === 0) {
        throw new Error("Não foi possível identificar o molde da sessão anterior. Tente configurar o molde manualmente ou verifique se a rotina possui treinos.");
      }
      throw new Error("A IA não retornou nenhuma sessão estruturada. Verifique se o pool de exercícios da biblioteca atende aos filtros de equipamento/metodologia do molde.");
    }

  const porChave = new Map(template.map((b) => [b.chave, b]));

  const sessoes: PrescricaoHibridoSessao[] = sessoesRaw.map((s: any) => {
    const blocosRaw = Array.isArray(s?.blocos) ? s.blocos : [];
    const usadosNaSessao = new Set<string>();

    const blocos: PrescricaoHibridoBloco[] = template.map((bt) => {
      if (bt.selecaoExercicios === "manual") {
        return { chave: bt.chave, exerciciosIds: bt.exerciciosFixos ?? [] };
      }

      const recebido = blocosRaw.find((b: any) => b?.chave === bt.chave);
      const idsRecebidos: string[] = Array.isArray(recebido?.exercicios_ids)
        ? recebido.exercicios_ids.filter((x: unknown) => typeof x === "string")
        : [];

      const poolValido = new Set((candidatos[bt.chave] ?? []).map((c) => c.id));
      let validos = idsRecebidos.filter((id) => poolValido.has(id) && !usadosNaSessao.has(id));
      validos = Array.from(new Set(validos)).slice(0, bt.numeroExercicios);

      // Completa com candidatos não usados se a IA retornou de menos ou inválido.
      if (validos.length < bt.numeroExercicios) {
        const restantes = (candidatos[bt.chave] ?? [])
          .map((c) => c.id)
          .filter((id) => !validos.includes(id) && !usadosNaSessao.has(id));
        for (const id of restantes) {
          if (validos.length >= bt.numeroExercicios) break;
          validos.push(id);
        }
      }

      validos.forEach((id) => usadosNaSessao.add(id));
      return { chave: bt.chave, exerciciosIds: validos };
    });

    return { blocos };
  });

  // Referenciar porChave evita import não utilizado quando o TS estiver estrito
  // com noUnusedLocals; mantém a validação legível caso precise checar formato/duracao.
  void porChave;

  return { sessoes, notes: typeof json?.notes === "string" ? json.notes : "" };
}
