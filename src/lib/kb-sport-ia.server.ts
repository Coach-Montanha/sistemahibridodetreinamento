/** Prompts especializados por escola metodológica do Kettlebell Sport. */

export type EscolaMetodologica =
  | "auto"
  | "fedorenko"
  | "rudnev"
  | "vorotyntsev"
  | "denisov"
  | "vasilev"
  | "gomonov";

export type NivelAtleta = "iniciante" | "intermediario" | "avancado" | "elite";
export type Disciplina = "biathlon" | "long_cycle" | "ambas";

export type CargaLevantamento = {
  pesoKettlebellKg: number | null;
  repsAtuais10min: number | null;
};

export type KbSportPayload = {
  escolaMetodologica: EscolaMetodologica;
  nivelAtleta: NivelAtleta;
  disciplina: Disciplina;
  pesoCorporalKg: number | null;
  cargas: {
    snatch?: CargaLevantamento;
    jerk?: CargaLevantamento;
    longCycle?: CargaLevantamento;
  };
};

export const ESCOLA_LABEL: Record<Exclude<EscolaMetodologica, "auto">, string> = {
  fedorenko: "Fedorenko / WKC",
  rudnev: "Rudnev",
  vorotyntsev: "Vorotyntsev",
  denisov: "Denisov",
  vasilev: "Vasilev",
  gomonov: "Gomonov / Machotkin",
};

const PROMPT_ESCOLA: Record<Exclude<EscolaMetodologica, "auto">, string> = {
  fedorenko: `LINHA FEDORENKO / WKC: volume progressivo com séries longas de ritmo constante (sets de 5 a 10 min), técnica minimalista e econômica, poucas variações. Ênfase em acumular tempo sob o sino com pace fixo (reps/min), séries de repetição contínua e trabalho complementar leve de core e pernas.`,
  rudnev: `LINHA RUDNEV: periodização científica com controle de intensidade por % das reps máximas, alternância entre sessões de volume, ritmo e recuperação. Ênfase na fase de relaxamento dentro do ciclo do movimento, respiração acoplada, séries por tempo com pace prescrito e trabalho de flexibilidade/relaxamento no fim.`,
  vorotyntsev: `LINHA VOROTYNTSEV: didática técnica por estágios — decompõe o levantamento em partes (pegada, fixação, queda, respiração), muitas séries curtas de alta qualidade técnica, correções progressivas, aumento de carga só após domínio do estágio.`,
  denisov: `LINHA DENISOV: altíssimo volume competitivo, múltiplas séries longas com carga próxima da competição, treino frequente e forte demanda de resistência específica. Adequado para atletas avançados/elite.`,
  vasilev: `LINHA VASILEV: ciclos de 4 a 6 semanas com testes de controle no fim de cada ciclo, progressão em degraus de volume e carga, sessões de ritmo alternadas com sessões de força específica.`,
  gomonov: `LINHA GOMONOV / MACHOTKIN: onboarding pedagógico para iniciantes — carga leve, séries curtas, muito trabalho de mobilidade, respiração e postura, aumento gradual de tempo sob o sino e ênfase em segurança articular.`,
};

/** Orquestrador (escola = "auto"): escolhe a linha pelo perfil do atleta. */
export function escolherEscola(
  nivel: NivelAtleta,
  disciplina: Disciplina,
): Exclude<EscolaMetodologica, "auto"> {
  if (nivel === "iniciante") return "gomonov";
  if (nivel === "intermediario") return disciplina === "long_cycle" ? "vasilev" : "rudnev";
  if (nivel === "avancado") return "fedorenko";
  return "denisov";
}

export const KB_SPORT_SYSTEM_PROMPT = `Você é um treinador especialista em KETTLEBELL SPORT (Girevoy Sport) de nível internacional.
Este motor é exclusivo de Kettlebell Sport: prescreva apenas movimentos de competição e assistências específicas — Snatch, Jerk, Long Cycle, Half Snatch, Swing, Clean, fixações, segurações (holds), rack holds, além de assistências gerais leves (core, pernas, grip, mobilidade).
PROIBIDO prescrever exercícios de sala de musculação (supino, leg press, cadeira extensora, rosca em polia), CrossFit/MetCon ou ginásticos.
Você NÃO tem acesso a nenhum banco de exercícios: escreva os nomes por extenso, em português.
Em Kettlebell Sport o volume é definido por TEMPO e RITMO: use "sets_reps" no formato "3x5min" ou "4x2min", coloque o peso do sino em "load" (ex.: "24kg" ou "2x24kg") e o pace/detalhes em "observations" (ex.: "12 rpm, respiração 2:1").
Exercícios podem ser combinados em complexos: use o mesmo prefixo em "group" ("A1"/"A2") e "group_type" igual a "superset"; isolados usam "group" vazio e "group_type" "individual".
Responda APENAS com JSON válido, sem markdown, no formato:
{
  "days": [
    { "name": "Sessão 1", "day_label": "Dia 1", "description": "Foco da sessão",
      "exercises": [ { "name": "Long Cycle", "sets_reps": "3x5min", "load": "24kg",
        "rest_seconds": 180, "observations": "10 rpm", "group": "", "group_type": "individual" } ] }
  ],
  "notes": "Observações finais do ciclo"
}
Regras: 3 a 7 exercícios por sessão; sempre inclua aquecimento específico e finalização de mobilidade dentro da sessão; 'load' e 'observations' podem ser vazios.`;

export function montarKbSportPrompt(args: {
  kb: KbSportPayload;
  linha: Exclude<EscolaMetodologica, "auto">;
  semanas: number;
  diasPorSemana: number | null;
  dataInicio: string | null;
  escopoLabel: string | null;
  instrucoes: string;
}): string {
  const { kb, linha, semanas, diasPorSemana, dataInicio, escopoLabel } = args;
  const dias = diasPorSemana && diasPorSemana > 0 ? diasPorSemana : 1;
  const dados = {
    escola_metodologica: linha,
    nivel_atleta: kb.nivelAtleta,
    disciplina: kb.disciplina,
    escopo_geracao: escopoLabel ?? `${semanas}_semanas`,
    dias_por_semana: dias,
    data_inicio: dataInicio,
    cargas_iniciais: {
      peso_corporal_kg: kb.pesoCorporalKg,
      snatch: kb.cargas.snatch ?? undefined,
      jerk: kb.cargas.jerk ?? undefined,
      long_cycle: kb.cargas.longCycle ?? undefined,
    },
  };

  return [
    PROMPT_ESCOLA[linha],
    "",
    "Dados do atleta e da geração:",
    JSON.stringify(dados, null, 2),
    "",
    `Gere um programa de ${semanas} semana(s), ${dias} sessão(ões)/semana, iniciando em ${
      dataInicio ?? "data não informada"
    }, seguindo estritamente a filosofia ${ESCOLA_LABEL[linha]} descrita acima e partindo das cargas informadas (se ausentes, assuma padrão conservador para o nível).`,
    `OBRIGATÓRIO: gere exatamente ${dias} sessão(ões) distinta(s), que formam a semana-modelo a ser repetida/progredida ao longo das ${semanas} semana(s).`,
    "",
    "INSTRUÇÕES DO TREINADOR:",
    args.instrucoes.trim().length > 0
      ? args.instrucoes.trim()
      : "Sem instruções adicionais.",
    "",
    "Responda APENAS em JSON válido no schema de programa.",
  ].join("\n");
}