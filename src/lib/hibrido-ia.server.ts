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
  if (!formatId) return "circuito";
  if (formatId.startsWith("builtin:")) return formatId.replace("builtin:", "");
  if (formatId.startsWith("custom:")) return formatId; 
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
  /** Referência ao ID do preset usado (builtin:X ou custom:X) para fins de UI. */
  presetId?: string | null;
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

    let query = supabase.from("exercises")
      .select("id, nome_pt")
      .not("nome_pt", "ilike", "[Pendente] %")
      .order("nome_pt")
      .limit(60);

    // Regras de conexão Bloco -> Equipamento (e Metodologia quando implícito)
    const metodologias = [...(bloco.fonteExercicios.metodologias ?? [])];
    const equipamentos = [...(bloco.fonteExercicios.equipamento ?? [])];

    const formatBase = resolveBaseFormat(bloco.formato || "");
    if (formatBase === "preparacao_movimento" || formatBase === "mobilidade") {

      if (bloco.slot === "mobilidade") {
        // Bloco de mobilidade só consegue solicitar e selecionar movimentos do equipamento mobilidade.
        equipamentos.push("Mobilidade");
      }
    } else if (bloco.titulo?.toLowerCase() === "aquecimento" || (bloco.chave && bloco.chave.includes("aquecimento"))) {
      // Bloco de aquecimento só consegue solicitar e selecionar movimentos do bloco kettlebell e ginástico.
      equipamentos.push("Kettlebell", "Ginásticos");
    } else if (metodologias.includes("musculacao")) {
      // Para musculação, incluir Alternativos Musculação se não houver filtro restritivo de equipamentos
      if (equipamentos.length === 0) {
        equipamentos.push("Kettlebell", "Ginásticos", "Dumbbell", "Barbell", "Alternativos Musculação");
      }
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
      
      // LOG DE DIAGNÓSTICO: Registrar pool vazio para rastreamento
      console.warn(`[buscarCandidatosDoMolde] Pool vazio para bloco "${bloco.titulo ?? bloco.chave}":`, {
        equipamentosNormalizados,
        metodologias,
        chave: bloco.chave
      });
      
      throw new Error(`POOL_VAZIO: O pool de exercícios da biblioteca não atende aos filtros de ${equipDesc} e ${metDesc} do molde "${bloco.titulo ?? bloco.chave}".`);
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

/** Diretriz padrão; instruções do treinador podem substituir os percentuais. */
export const DIRETRIZ_VARIACAO_HIBRIDO = `DIRETRIZ PADRÃO DE DISTRIBUIÇÃO E VARIAÇÃO (EDITÁVEL):
- Meta aproximada do tempo total: 36% movimentos ginásticos/peso corporal, 28% exercícios com halteres e 36% exercícios com kettlebell.
- Em sequências curtas, aproxime os percentuais e informe a distribuição real; não trate a meta como regra rígida por exercício.
- Não copie a mesma sessão, o mesmo circuito ou a mesma combinação de exercícios em dias diferentes.
- Não repita o mesmo exercício em sessões consecutivas quando houver alternativas viáveis; busque sobreposição inferior a 25% entre sessões consecutivas.
- Controle os IDs usados na sequência inteira e penalize exercícios recém-utilizados, sem repetir indiscriminadamente.
- Varie padrões de movimento, ordem, foco e estímulo, mantendo os blocos, tempos, séries, repetições, descansos e equipamentos do molde.
- Faça progressão coerente entre técnica/controle, força/estabilidade, potência/velocidade, resistência/densidade e integração.
- Se o pool for insuficiente, informe a repetição inevitável e nunca apresente uma cópia idêntica como sessão nova.`;

function instrucoesHibrido(instrucoes: string): string {
  const custom = instrucoes.trim();
  const possuiRegraDeDistribuicao = /(?:\d{1,3}\s*%.*(?:gin[aá]stic|halter|kettlebell)|(?:gin[aá]stic|halter|kettlebell).*\d{1,3}\s*%)/is.test(custom);
  if (!custom) return DIRETRIZ_VARIACAO_HIBRIDO;
  return possuiRegraDeDistribuicao ? custom : `${custom}\n\n${DIRETRIZ_VARIACAO_HIBRIDO}`;
}

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
    "DIRETRIZ DE DISTRIBUIÇÃO E VARIAÇÃO DA SEQUÊNCIA:",
    "- Trate TODAS as sessões desta geração como uma única sequência progressiva e variada. NUNCA copie a mesma sessão, o mesmo bloco ou a mesma combinação de exercícios em dias diferentes.",
    "- Direcionador de tempo TOTAL da sequência (não é regra rígida por exercício): ~36% movimentos ginásticos/peso corporal, ~28% halteres, ~36% kettlebell. Se a duração ou o número de blocos não permitir os percentuais exatos, use a distribuição inteira mais próxima e preserve a intenção geral. Informe no campo \"notes\" a distribuição aproximada realmente utilizada.",
    "- Não invente equipamentos indisponíveis e não altere os equipamentos configurados no molde.",
    "",
    "REGRAS DE DIVERSIDADE ENTRE SESSÕES:",
    "1. Mantenha registro interno dos exercise_id já usados em cada sessão e no conjunto da sequência.",
    "2. Cada sessão deve ter composição diferente, com ao menos uma mudança relevante em: exercícios, ordem, padrão de movimento, foco, método ou combinação de blocos.",
    "3. Não repita o mesmo exercício em sessões consecutivas; mantenha a sobreposição entre duas sessões consecutivas abaixo de 25%. Só repita antes disso se o pool for insuficiente ou o exercício for indispensável à progressão — nesse caso registre o motivo em \"notes\".",
    "4. Não repita a mesma combinação completa de exercícios, o mesmo circuito A/B/C ou o mesmo conjunto de movimentos em outra sessão. Trocar apenas a ordem NÃO torna o treino diferente.",
    "5. Faça rotação dos padrões de movimento conforme o molde permitir: agachar, dobrar quadril, empurrar, puxar, transportar, estabilizar o core, locomover, saltar, ginásticos. Evite a mesma sequência de padrões em todas as sessões.",
    "6. Varie o foco das sessões de forma coerente, sem perder progressão. Rotação sugerida: técnica e controle; força e estabilidade; potência e velocidade; resistência e densidade; integração/condicionamento — adaptada aos blocos e formatos realmente configurados.",
    "7. Preserve blocos, formatos, duração, séries, repetições, descansos e equipamentos definidos no molde. Esta diretriz orienta apenas a seleção e a variação dos exercícios.",
    "8. Progressão gradual: aumente complexidade, densidade, amplitude, carga ou qualidade técnica só quando compatível com o nível do aluno e com o bloco. Nunca aumente todas as variáveis ao mesmo tempo.",
    "",
    "REGRAS POR CATEGORIA:",
    "- Ginásticos/peso corporal: priorize controle corporal, estabilidade, apoio, suspensão, deslocamento, agachamento, empurrar, puxar e core, com progressões/regressões conforme o nível.",
    "- Halteres: alterne bilateral e unilateral, planos de movimento e padrões de força. Evite sempre o mesmo empurrar ou o mesmo agachamento.",
    "- Kettlebell: distribua dobradiça, agachamento, transporte, potência, estabilidade e controle; alterne balísticos e força/controle sem repetir a mesma sequência em sessões consecutivas.",
    "",
    "HISTÓRICO E VERIFICAÇÃO FINAL:",
    "- Use o histórico dos treinos anteriores E o histórico das sessões geradas nesta mesma solicitação. Exclua ou penalize exercícios recém-utilizados antes de escolher novos.",
    "- Se o pool for pequeno e a diversidade não for possível, use os melhores exercícios disponíveis e informe em \"notes\" quais repetições foram inevitáveis. Nunca apresente sessões idênticas como se fossem diferentes.",
    "- Antes de finalizar, compare cada sessão com todas as anteriores da sequência, confirme a distribuição aproximada por tempo e substitua duplicações desnecessárias.",
    "",

    setTypeRegistry ? `TIPOS DE SÉRIES DISPONÍVEIS: ${setTypeRegistry.map(t => `${t.label} (ID: ${t.id})`).join(" | ")}` : "",
    customFormats && customFormats.length > 0 ? `FORMATOS DE BLOCO CUSTOMIZADOS DISPONÍVEIS: ${customFormats.map((f: any) => `${f.label} (ID: ${f.id})`).join(" | ")}` : "",
    historySection ? `\nCONTEXTO DO PROGRAMA (HISTÓRICO E PROGRESSÃO):\n${historySection}` : "",
    "",
    "Molde estrutural:",
    JSON.stringify(blocosDescricao, null, 2),
    "",
    "INSTRUÇÕES DO TREINADOR:",
    instrucoesHibrido(instrucoes),
    "",
    `Responda APENAS em JSON válido no campo "notes" escreva um "RELATÓRIO DE EVOLUÇÃO" detalhando o que foi mudado em relação ao histórico. IMPORTANTE: Identifique o número da semana para cada sessão gerada no campo "week_numbers" (array de números inteiros paralela ao array de sessões):`,
    JSON.stringify(
      {
        sessoes: [
          {
            blocos: [{ chave: "<chave_do_bloco>", exercicios_ids: ["<id1>", "<id2>"] }],
          },
        ],
        week_numbers: [1],
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
  numeroSessoesEsperadas?: number,
): PrescricaoHibrido {
  if (!bruto || bruto.trim().length === 0) {
    throw new Error("AI_EMPTY_CONTENT: A IA devolveu uma resposta vazia.");
  }

  let json: any;
  let parseError = false;
  try {
    const limpo = bruto
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    json = JSON.parse(limpo);
  } catch (err) {
    console.error("HibridoIA: Falha no parse JSON da IA", { bruto, error: err });
    parseError = true;
  }

  // Se falhou o parse ou o schema não bate, tentamos extrair sessoes de wrappers
  if (!parseError) {
    if (!json.sessoes && (json.data?.sessoes || json.result?.sessoes || json.output?.sessoes)) {
      json = json.data || json.result || json.output;
    } else if (Array.isArray(json) && json.length > 0 && json[0].blocos) {
      // Caso a IA devolva um array direto no topo
      json = { sessoes: json };
    }
  }
  // O modelo pode devolver a mesma lista para todas as sessões. Mantemos um
  // conjunto por bloco para que a normalização prefira exercícios ainda não
  // usados na sequência, sem repetir quando o pool for insuficiente.
  const usadosNaSequenciaPorBloco = new Map<string, Set<string>>();


  const sessoesRaw = (!parseError && Array.isArray(json?.sessoes)) ? json.sessoes : [];
  const usedFallback = sessoesRaw.length === 0;

  if (usedFallback) {
    console.warn("HibridoIA: Iniciando fallback determinístico por falha no schema/parse da IA.");
  }

  // O número de sessões é inferido pela resposta da IA. No fallback, cobre
  // todas as sessões pedidas (o preenchimento determinístico com rotação já
  // garante variação entre elas) em vez de gerar uma única sessão silenciosa.
  const numSessoes = usedFallback
    ? Math.max(1, Math.min(52, numeroSessoesEsperadas ?? 1))
    : sessoesRaw.length;
  const finalSessoes: PrescricaoHibridoSessao[] = [];
  const avisosDiversidade: string[] = [];

  // Uso acumulado ao longo de TODA a sequência (para rotação determinística)
  const usoGlobal = new Map<string, number>();
  let usadosSessaoAnterior = new Set<string>();

  for (let i = 0; i < numSessoes; i++) {
    const sRaw = sessoesRaw[i] || {};
    const blocosRaw = Array.isArray(sRaw?.blocos) ? sRaw.blocos : [];
    const usadosNaSessao = new Set<string>();

    const blocos: PrescricaoHibridoBloco[] = template.map((bt) => {
      if (bt.selecaoExercicios === "manual") {
        return { chave: bt.chave, exerciciosIds: bt.exerciciosFixos ?? [] };
      }

      const recebido = blocosRaw.find((b: any) => b?.chave === bt.chave);
      const idsRecebidos: string[] = Array.isArray(recebido?.exercicios_ids)
        ? recebido.exercicios_ids.filter((x: unknown) => typeof x === "string")
        : [];

      const poolCandidatos = candidatos[bt.chave] ?? [];
      const poolValido = new Set(poolCandidatos.map((c) => c.id));
      const usadosNaSequencia = usadosNaSequenciaPorBloco.get(bt.chave) ?? new Set<string>();
      usadosNaSequenciaPorBloco.set(bt.chave, usadosNaSequencia);

      // 1. Filtrar só IDs que REALMENTE existem no pool permitido para este bloco
      let finalIds = idsRecebidos.filter((id) => {
        const ok = poolValido.has(id);
        if (!ok) {
          console.warn(`[HibridoIA] IA alucinou ID "${id}" fora do pool do bloco "${bt.chave}"`);
        }
        return ok && !usadosNaSessao.has(id);
      });

      // Prioriza IDs ainda não usados nesta sequência (a IA tende a repetir a mesma lista).
      finalIds = [
        ...finalIds.filter((id) => !usadosNaSequencia.has(id)),
        ...finalIds.filter((id) => usadosNaSequencia.has(id)),
      ];

      finalIds = Array.from(new Set(finalIds)).slice(0, bt.numeroExercicios);


      // 2. Anti-repetição entre sessões consecutivas: se o pool comportar,
      //    troca IDs que vieram da sessão anterior por alternativas frescas.
      if (i > 0) {
        const livres = poolCandidatos
          .filter(
            (c) =>
              !usadosNaSessao.has(c.id) &&
              !finalIds.includes(c.id) &&
              !usadosSessaoAnterior.has(c.id),
          )
          .sort((a, b) => (usoGlobal.get(a.id) ?? 0) - (usoGlobal.get(b.id) ?? 0));

        finalIds = finalIds.map((id) => {
          if (!usadosSessaoAnterior.has(id)) return id;
          const alt = livres.shift();
          if (!alt) {
            avisosDiversidade.push(
              `Repetição inevitável no bloco "${bt.titulo ?? bt.formato}": pool insuficiente para evitar exercícios da sessão anterior.`,
            );
            return id;
          }
          return alt.id;
        });
      }

      // 3. Fallback determinístico: completa com os candidatos menos usados,
      //    preferindo os que não apareceram na sessão anterior.
      if (finalIds.length < bt.numeroExercicios) {
        const faltantes = bt.numeroExercicios - finalIds.length;
        const disponiveis = poolCandidatos
          .filter((c) => !usadosNaSessao.has(c.id) && !finalIds.includes(c.id))
          .sort((a, b) => {
            const pa =
              (usadosSessaoAnterior.has(a.id) ? 1000 : 0) +
              (usadosNaSequencia.has(a.id) ? 100 : 0) +
              (usoGlobal.get(a.id) ?? 0);
            const pb =
              (usadosSessaoAnterior.has(b.id) ? 1000 : 0) +
              (usadosNaSequencia.has(b.id) ? 100 : 0) +
              (usoGlobal.get(b.id) ?? 0);
            return pa - pb;
          })
          .map((c) => c.id);

        finalIds.push(...disponiveis.slice(0, faltantes));
      }

      finalIds.forEach((id) => {
        usadosNaSessao.add(id);
        usadosNaSequencia.add(id);
        usoGlobal.set(id, (usoGlobal.get(id) ?? 0) + 1);
      });
      return { chave: bt.chave, exerciciosIds: finalIds };

    });

    finalSessoes.push({ blocos });
    usadosSessaoAnterior = usadosNaSessao;
  }

  return { 
    sessoes: finalSessoes, 
    week_numbers: Array.isArray(json?.week_numbers) ? json.week_numbers : finalSessoes.map((_, i) => i + 1),
    notes: typeof json?.notes === "string" ? json.notes : (usedFallback ? "A IA não retornou o schema esperado; as sessões foram montadas com fallback determinístico a partir do molde." : "Sessões geradas com base no molde."),
    usedFallback,
    avisos: [
      ...(usedFallback ? ["A IA não retornou o schema esperado; as sessões foram montadas com fallback determinístico a partir do molde."] : []),
      ...Array.from(new Set(avisosDiversidade)),
    ],
  } as any;
}


