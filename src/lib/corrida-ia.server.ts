/** Prompts especializados por escola metodológica de Corrida. */

export type EscolaCorrida =
  | "auto"
  | "daniels"
  | "lydiard"
  | "canova"
  | "hansons"
  | "pfitzinger"
  | "horwill"
  | "koop";

export type NivelAtletaCo = "iniciante" | "intermediario" | "avancado" | "elite";

export type DistanciaAlvo = "corrida_rua" | "5k" | "10k" | "21k" | "42k" | "ultramaratona";

export type RegiaoLesaoCo =
  | "lombar"
  | "joelho"
  | "ombro"
  | "quadril"
  | "tornozelo"
  | "core"
  | "outro";

export type FaseLesaoCo = "aguda" | "em_recuperacao" | "cronica_controlada";

export type LesaoCorrida = {
  regiao: RegiaoLesaoCo;
  fase: FaseLesaoCo;
  observacaoLivre: string | null;
};

export type TerrenoAlvo = "estrada" | "trilha" | "montanha" | "pista";

export type CorridaPayload = {
  escolaMetodologica: EscolaCorrida;
  nivelAtleta: NivelAtletaCo;
  distanciaAlvo: DistanciaAlvo;
  volumeSemanalKm: number | null;
  frequenciaSemanalAtual: number | null;
  marcaRecenteDistancia: DistanciaAlvo | null;
  marcaRecenteTempo: string | null;
  dataProvaAlvo: string | null;
  terreno: TerrenoAlvo | null;
  preferenciaAltaFrequencia: boolean;
  lesoes: LesaoCorrida[];
};

export const ESCOLA_CO_LABEL: Record<Exclude<EscolaCorrida, "auto">, string> = {
  daniels: "Daniels / VDOT",
  lydiard: "Lydiard (base aeróbica)",
  canova: "Canova (extensão do ritmo)",
  hansons: "Hansons (fadiga cumulativa)",
  pfitzinger: "Pfitzinger (limiar + long run)",
  horwill: "Horwill / Multi-Tier (5 ritmos)",
  koop: "Koop (ultramaratona)",
};

const PROMPT_ESCOLA_CO: Record<Exclude<EscolaCorrida, "auto">, string> = {
  daniels: `LINHA DANIELS / VDOT (Jack Daniels) — ritmo certo para o propósito certo.
- Se uma marca recente de prova foi informada, estime o VDOT do atleta de forma consistente com as tabelas de Daniels e declare-o nas observações finais.
- A partir do VDOT, derive os cinco ritmos: Easy (65-78% VO2max), Marathon (80-84%), Threshold (88-92%), Interval (95-100%) e Repetition (acima de 100%) — use esses ritmos, e apenas esses, para toda prescrição de intensidade.
- A maior parte da quilometragem semanal deve ser em ritmo Easy; sessões de Threshold, Interval ou Repetition entram conforme a fase do ciclo e a distância-alvo.
- Recomende recalcular o VDOT a cada 4-6 semanas ou após uma prova de referência.
- Estruture o ciclo em fases: base, desenvolvimento de velocidade e preparação específica de prova.`,
  lydiard: `LINHA LYDIARD (Arthur Lydiard) — a base aeróbica antes de tudo.
- Nunca introduza trabalho anaeróbico (velocidade máxima, intervalado intenso) antes de confirmar base aeróbica consolidada: priorize corrida contínua em "steady state" (repetível no dia seguinte).
- Estruture o ciclo em fases sequenciais e não sobrepostas: base aeróbica → colinas (força específica) → anaeróbico → afinamento → polimento (tapering). Nunca pule uma fase.
- Esta é a linha indicada como fase 1 para volume semanal baixo, nível iniciante ou retorno de lesão/afastamento, independentemente da distância-alvo — declare isso nas observações e indique a linha de destino após a base consolidada.
- Priorize volume sobre intensidade durante toda a fase de base.`,
  canova: `LINHA CANOVA (Renato Canova) — extensão da capacidade no ritmo de prova, 21k/42k avançado/elite.
- Trate a prova como questão de "extensão": aumente progressivamente o volume sustentado no ritmo-alvo, não apenas quilometragem genérica.
- Progrida de "velocidades especiais" (90-110% do ritmo-alvo) para trabalho específico (95-105% do ritmo-alvo).
- A cada 3-4 semanas inclua um "bloco especial/específico": um dia com dois treinos (manhã e tarde) de maior exigência, seguido de recuperação proporcionalmente maior. Nunca encadeie blocos sem essa recuperação.
- Exclusiva para avançado/elite com base aeróbica consolidada. Se o perfil não atender, prescreva na linha Pfitzinger e explique o motivo nas observações.
- Inclua trabalho de oxidação aeróbica de lactato (ex.: 1km a ~105% do ritmo-alvo alternado com 1km levemente mais lento) como ferramenta regular.`,
  hansons: `LINHA HANSONS MARATHON METHOD — fadiga cumulativa, 21k/42k.
- Limite o long run a ~26km, independentemente do volume semanal — o efeito vem da fadiga acumulada dos dias anteriores.
- Frequência de 6 dias de treino por semana é não-negociável: ritmo de prova-alvo nos dias que antecedem o long run e corridas fáceis/moderadas nos dias intermediários, para que o long run ocorra sobre pernas fatigadas.
- Havendo histórico de lesão ao correr diariamente ou ao iniciar velocidade rapidamente, não use esta linha: prescreva em Pfitzinger ou Lydiard e explique nas observações.
- Corridas de threshold devem ser desafiadoras mas controladas (falar em frases curtas).`,
  pfitzinger: `LINHA PFITZINGER (Pete Pfitzinger) — limiar como motor da maratona.
- Estruture a semana em torno de duas sessões-chave: uma corrida de limiar (tempo run) e um long run tradicional, que pode chegar a 32-37km nas semanas de pico.
- Reduza levemente o volume nos dias que antecedem o long run e prescreva dia fácil ou descanso no dia seguinte.
- Linha padrão/fallback para intermediários de 21k/42k fora dos critérios de Canova e sem preferência pelo modelo Hansons.
- Progrida o volume gradualmente com semanas de redução de carga (cutback) a cada 3-4 semanas.`,
  horwill: `LINHA HORWILL / MULTI-TIER (Frank Horwill) — cinco ritmos, 5k/10k e meio-fundo.
- Nunca limite o trabalho a 2-3 ritmos: distribua o treino em cinco ritmos cobrindo de uma distância mais curta que a prova-alvo até uma mais longa.
- Use a "regra dos 4 segundos" por 400m para derivar ritmos entre distâncias adjacentes de forma consistente.
- Cada sessão de qualidade deve ter um ritmo-alvo declarado e um propósito fisiológico explícito.
- Exige base aeróbica prévia: para atletas sem base, indique a linha Lydiard antes.`,
  koop: `LINHA KOOP (Jason Koop) — ultramaratona.
- Ultramaratona não é "uma maratona mais longa": nunca prescreva apenas acúmulo linear de quilometragem.
- Estruture o macrociclo em dois blocos sequenciais: condicionamento/fitness geral primeiro, depois especificidade de prova (terreno, duração, ritmo de ultra).
- Inclua trabalho intervalado direcionado mesmo nesta modalidade, para focar adaptações e reduzir lesão por volume repetitivo.
- Inclua, como parte formal do plano, estratégia de nutrição e hidratação nos treinos longos, simulando a prova.
- Adapte ao terreno da prova-alvo quando informado (trilha técnica, estrada, montanha).`,
};

/** Seleção determinística (escola = "auto"). Segurança e base aeróbica têm prioridade. */
export function escolherEscolaCorrida(p: {
  lesoes: LesaoCorrida[];
  nivel: NivelAtletaCo;
  distanciaAlvo: DistanciaAlvo;
  volumeSemanalKm: number | null;
  preferenciaAltaFrequencia: boolean;
}): Exclude<EscolaCorrida, "auto"> {
  if (p.lesoes.some((l) => l.fase === "aguda" || l.fase === "em_recuperacao")) {
    return "lydiard";
  }
  if (p.nivel === "iniciante" || (p.volumeSemanalKm !== null && p.volumeSemanalKm < 20)) {
    return "lydiard";
  }
  if (p.distanciaAlvo === "ultramaratona") return "koop";
  if (p.distanciaAlvo === "5k" || p.distanciaAlvo === "10k") {
    return p.nivel === "avancado" || p.nivel === "elite" ? "horwill" : "daniels";
  }
  if (p.distanciaAlvo === "21k" || p.distanciaAlvo === "42k") {
    if (p.nivel === "avancado" || p.nivel === "elite") return "canova";
    if (p.preferenciaAltaFrequencia) return "hansons";
    return "pfitzinger";
  }
  return "daniels";
}

export const CO_SYSTEM_PROMPT = `Você é um treinador especialista em CORRIDA (rua, 5k, 10k, 21k, 42k e ultramaratona), atuando dentro de uma linha metodológica específica informada no pedido.
Este motor é exclusivo de corrida: prescreva sessões de corrida (rodagens fáceis, longões, limiar, intervalados, colinas, ritmo de prova, regenerativos) e, quando pertinente, trabalho complementar de força/mobilidade preventiva para corredores.
SEGURANÇA TEM PRIORIDADE MÁXIMA: corrida é a modalidade com maior incidência de lesão por overuse — respeite integralmente as lesões e limitações informadas, reduza volume quando houver fase aguda ou em recuperação e registre alertas explícitos nas observações.
Respeite o volume semanal atual informado: nunca aumente mais de ~10% por semana.
Você NÃO tem acesso a nenhum banco de exercícios: escreva os nomes das sessões e trechos por extenso, em português.
Sequências dentro da mesma sessão (ex.: aquecimento → série principal → volta à calma) usam "group" vazio e "group_type" "individual"; blocos alternados/repetidos podem usar o mesmo prefixo em "group" ("A1"/"A2") com "group_type" igual a "superset".
Responda APENAS com JSON válido, sem markdown, no formato:
{
  "days": [
    { "name": "Sessão 1", "day_label": "Dia 1", "description": "Foco da sessão",
      "exercises": [ { "name": "Rodagem em ritmo Easy", "sets_reps": "8 km contínuos", "load": "ritmo 6:10/km",
        "rest_seconds": 0, "observations": "Conversar em frases completas", "group": "", "group_type": "individual" } ] }
  ],
  "notes": "Observações finais, progressão de volume, reavaliação e alertas"
}
Regras: 3 a 7 itens por sessão, cobrindo aquecimento, parte principal e volta à calma; use 'sets_reps' para distância/tempo/séries e 'load' para o ritmo-alvo; campos podem ser vazios quando não se aplicarem.`;

const DISTANCIA_LABEL: Record<DistanciaAlvo, string> = {
  corrida_rua: "corrida de rua / condicionamento geral",
  "5k": "5 km",
  "10k": "10 km",
  "21k": "meia maratona (21 km)",
  "42k": "maratona (42 km)",
  ultramaratona: "ultramaratona",
};

const TERRENO_LABEL: Record<TerrenoAlvo, string> = {
  estrada: "estrada / asfalto",
  trilha: "trilha",
  montanha: "montanha",
  pista: "pista de atletismo",
};

export function montarCorridaPrompt(args: {
  co: CorridaPayload;
  linha: Exclude<EscolaCorrida, "auto">;
  semanas: number;
  diasPorSemana: number | null;
  dataInicio: string | null;
  escopoLabel: string | null;
  instrucoes: string;
}): string {
  const { co, linha, semanas, diasPorSemana, dataInicio, escopoLabel } = args;
  const dias = diasPorSemana && diasPorSemana > 0 ? diasPorSemana : 1;
  const dados = {
    linha_metodologica: linha,
    nivel_atleta: co.nivelAtleta,
    distancia_alvo: DISTANCIA_LABEL[co.distanciaAlvo],
    volume_semanal_atual_km: co.volumeSemanalKm,
    frequencia_semanal_atual: co.frequenciaSemanalAtual,
    marca_recente:
      co.marcaRecenteDistancia && co.marcaRecenteTempo
        ? {
            distancia: DISTANCIA_LABEL[co.marcaRecenteDistancia],
            tempo: co.marcaRecenteTempo,
          }
        : null,
    data_prova_alvo: co.dataProvaAlvo,
    terreno: co.terreno ? TERRENO_LABEL[co.terreno] : null,
    preferencia_alta_frequencia: co.preferenciaAltaFrequencia,
    lesoes_limitacoes: co.lesoes.map((l) => ({
      regiao: l.regiao,
      fase: l.fase,
      observacao_livre: l.observacaoLivre,
    })),
    escopo_geracao: escopoLabel ?? `${semanas}_semanas`,
    dias_por_semana: dias,
    data_inicio: dataInicio,
  };

  return [
    `LINHA METODOLÓGICA APLICADA: ${ESCOLA_CO_LABEL[linha]}`,
    PROMPT_ESCOLA_CO[linha],
    "",
    "DADOS DO ATLETA (JSON):",
    JSON.stringify(dados, null, 2),
    "",
    `OBRIGATÓRIO: gere exatamente ${dias} sessão(ões) distintas, formando a semana-padrão a ser repetida/progredida ao longo das ${semanas} semana(s).`,
    co.marcaRecenteDistancia && co.marcaRecenteTempo
      ? "OBRIGATÓRIO: derive os ritmos-alvo a partir da marca recente informada e declare-os em 'load'."
      : "OBRIGATÓRIO: sem marca recente, prescreva ritmos por percepção de esforço e explique como calibrar.",
    co.lesoes.length > 0
      ? "OBRIGATÓRIO: adapte volume e impacto às lesões/limitações listadas e explique a adaptação nas observações."
      : null,
    "",
    "INSTRUÇÕES DO TREINADOR:",
    args.instrucoes.trim().length > 0
      ? args.instrucoes.trim()
      : "Sem instruções adicionais: siga estritamente a filosofia da linha metodológica acima.",
  ]
    .filter(Boolean)
    .join("\n");
}
