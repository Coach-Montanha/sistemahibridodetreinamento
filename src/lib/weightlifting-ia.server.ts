/** Prompts especializados por escola metodológica do Levantamento de Peso Olímpico. */

export type EscolaWeightlifting =
  | "auto"
  | "bulgara"
  | "russa_classica"
  | "chinesa"
  | "cubana"
  | "colombiana"
  | "pendlay"
  | "takano";

export type NivelAtletaWl = "iniciante" | "intermediario" | "avancado" | "elite";
export type CapacidadeRecuperacao = "baixa" | "media" | "alta";
export type PontoFraco = "pernas" | "costas" | "recepcao" | "mobilidade_ombro";

export type CargaWl = { cargaKg: number | null };

export type WlPayload = {
  escolaMetodologica: EscolaWeightlifting;
  nivelAtleta: NivelAtletaWl;
  pesoCorporalKg: number | null;
  classificacaoOficial: string | null;
  pontoFracoIdentificado: PontoFraco | null;
  capacidadeRecuperacao: CapacidadeRecuperacao;
  suporteTotalDeclarado: boolean;
  cargas: {
    arranco?: CargaWl;
    arremesso?: CargaWl;
    agachamentoCostas?: CargaWl;
    agachamentoFrontal?: CargaWl;
  };
};

const ESCOLA_WL_LABEL: Record<Exclude<EscolaWeightlifting, "auto">, string> = {
  bulgara: "Búlgara",
  russa_classica: "Russa Clássica",
  chinesa: "Chinesa",
  cubana: "Cubana",
  colombiana: "Colombiana",
  pendlay: "Pendlay / MDUSA",
  takano: "Takano",
};

const PROMPT_ESCOLA_WL: Record<Exclude<EscolaWeightlifting, "auto">, string> = {
  bulgara: `LINHA BÚLGARA (Abadjiev): poucos exercícios (arranco, arremesso, agachamento frontal), máximos diários ou quase-diários, múltiplas sessões curtas, intensidade 90-100% quase todos os dias, volume acessório mínimo. EXCLUSIVA para atletas elite com recuperação alta e suporte total; inclua alerta explícito de risco nas observações.`,
  russa_classica: `LINHA RUSSA CLÁSSICA (Medvedev): periodização em blocos com distribuição GPP/SPP, volume alto e variação ampla de exercícios (puxadas, agachamentos, levantamentos parciais, complementares), intensidades médias (70-85%) predominantes e ondulação semanal de volume/intensidade.`,
  chinesa: `LINHA CHINESA: alta frequência com sessões duplas, forte ênfase em correção do ponto fraco identificado via exercícios especiais dirigidos, uso amplo de puxadas, agachamentos e variações de posição, controle de intensidade por RPE/percentual e trabalho de estabilidade articular.`,
  cubana: `LINHA CUBANA: didática para iniciantes/intermediários, muitas séries curtas de baixa repetição (1-3) com carga moderada, ênfase em velocidade de barra e aprendizado técnico, progressão conservadora e ampla base de exercícios preparatórios.`,
  colombiana: `LINHA COLOMBIANA: triagem por nível de classificação — combina fundamentos russos com progressão por degraus de classificação, ajustando volume e densidade conforme a categoria do atleta e a proximidade da competição.`,
  pendlay: `LINHA PENDLAY / MDUSA: ensino técnico direto, frequência adaptada ao atleta, séries de qualidade com carga guiada por sensação diária, forte trabalho de força de base (agachamento e puxadas) junto aos levantamentos completos.`,
  takano: `LINHA TAKANO: framework científico de planejamento — controle de carga por tonelagem e densidade, respeito à recuperação, progressão conservadora, ampla instrução técnica; usada como padrão em perfis ambíguos.`,
};

/** Seleção determinística (escola = "auto"). */
export function escolherEscolaWl(p: {
  nivel: NivelAtletaWl;
  pontoFraco: PontoFraco | null;
  classificacao: string | null;
  recuperacao: CapacidadeRecuperacao;
  suporteTotal: boolean;
}): Exclude<EscolaWeightlifting, "auto"> {
  if (p.nivel === "iniciante") return "cubana";
  if (p.pontoFraco) return "chinesa";
  const classe = (p.classificacao ?? "").toLowerCase();
  if (
    (p.nivel === "elite" || p.nivel === "avancado") &&
    /mestre/.test(classe) &&
    p.recuperacao === "alta" &&
    p.suporteTotal
  ) {
    return "bulgara";
  }
  if (p.nivel === "intermediario") return "russa_classica";
  return "takano";
}

export const WL_SYSTEM_PROMPT = `Você é um treinador especialista em LEVANTAMENTO DE PESO OLÍMPICO (Weightlifting) de nível internacional.
Este motor é exclusivo de Weightlifting: prescreva apenas os levantamentos de competição, suas variações e assistências específicas — Arranco (Snatch), Arremesso (Clean & Jerk), variações de bloco/suspensão/potência, puxadas altas, agachamentos (costas/frontal/overhead), pressões acima da cabeça, levantamentos parciais e trabalho de mobilidade/estabilidade.
PROIBIDO prescrever CrossFit/MetCon, kettlebell sport ou exercícios de estética de sala de musculação sem função para o levantamento.
Você NÃO tem acesso a nenhum banco de exercícios: escreva os nomes por extenso, em português.
O volume é definido por SÉRIES x REPETIÇÕES e a intensidade por PERCENTUAL DE 1RM: use "sets_reps" no formato "5x3", coloque a intensidade em "load" (ex.: "80% 1RM" ou "100kg") e detalhes técnicos em "observations".
Exercícios podem ser combinados em complexos: use o mesmo prefixo em "group" ("A1"/"A2") e "group_type" igual a "superset"; isolados usam "group" vazio e "group_type" "individual".
Responda APENAS com JSON válido, sem markdown, no formato:
{
  "days": [
    { "name": "Sessão 1", "day_label": "Dia 1", "description": "Foco da sessão",
      "exercises": [ { "name": "Arranco", "sets_reps": "5x2", "load": "80% 1RM",
        "rest_seconds": 180, "observations": "Foco na recepção", "group": "", "group_type": "individual" } ] }
  ],
  "notes": "Observações finais do ciclo"
}
Regras: 3 a 7 exercícios por sessão; sempre inclua aquecimento específico e finalização de mobilidade dentro da sessão; 'load' e 'observations' podem ser vazios.`;

export function montarWlPrompt(args: {
  wl: WlPayload;
  linha: Exclude<EscolaWeightlifting, "auto">;
  semanas: number;
  diasPorSemana: number | null;
  dataInicio: string | null;
  escopoLabel: string | null;
  instrucoes: string;
  resumoAnterior?: string | null;
}): string {
  const { wl, linha, semanas, diasPorSemana, dataInicio, escopoLabel, resumoAnterior } = args;
  const dias = diasPorSemana && diasPorSemana > 0 ? diasPorSemana : 1;
  const dados = {
    escola_metodologica: linha,
    nivel_atleta: wl.nivelAtleta,
    classificacao_oficial: wl.classificacaoOficial,
    ponto_fraco_identificado: wl.pontoFracoIdentificado,
    capacidade_recuperacao: wl.capacidadeRecuperacao,
    suporte_total_declarado: wl.suporteTotalDeclarado,
    escopo_geracao: escopoLabel ?? `${semanas}_semanas`,
    dias_por_semana: dias,
    data_inicio: dataInicio,
    cargas_iniciais: {
      peso_corporal_kg: wl.pesoCorporalKg,
      arranco: wl.cargas.arranco ?? undefined,
      arremesso: wl.cargas.arremesso ?? undefined,
      agachamento_costas: wl.cargas.agachamentoCostas ?? undefined,
      agachamento_frontal: wl.cargas.agachamentoFrontal ?? undefined,
    },
  };

  const alertaBulgara =
    linha === "bulgara" &&
    !(wl.suporteTotalDeclarado && wl.capacidadeRecuperacao === "alta")
      ? "ATENÇÃO: a linha Búlgara foi escolhida sem as três condições (elite, recuperação alta, suporte total). Reduza a densidade de máximos e registre esse alerta em 'notes'."
      : null;

  return [
    PROMPT_ESCOLA_WL[linha],
    alertaBulgara,
    "",
    "Dados do atleta e da geração:",
    JSON.stringify(dados, null, 2),
    "",
    resumoAnterior ? `HISTÓRICO DA PROGRAMAÇÃO ATUAL:\n${resumoAnterior}\n` : null,
    "",
    `Sua tarefa é planejar a CONTINUIDADE e PERIODIZAÇÃO EM BLOCO da programação.`,
    `Analise o HISTÓRICO acima para projetar a sobrecarga progressiva e PERIODIZAÇÃO ONDULATÓRIA.`,
    `OBRIGATÓRIO: Identifique corretamente o "week_number" (1, 2, 3...) para cada sessão gerada.`,
    "",
    `Gere um programa de ${semanas} semana(s), ${dias} sessão(ões)/semana, iniciando em ${
      dataInicio ?? "data não informada"
    }, seguindo estritamente a filosofia ${ESCOLA_WL_LABEL[linha]} descrita acima e partindo das cargas informadas (se ausentes, assuma padrão conservador para o nível).`,
    `OBRIGATÓRIO: gere exatamente ${dias} sessão(ões) distinta(s), que formam a semana-modelo a ser repetida/progredida ao longo das ${semanas} semana(s).`,
    "",
    "INSTRUÇÕES DO TREINADOR:",
    args.instrucoes.trim().length > 0 ? args.instrucoes.trim() : "Sem instruções adicionais.",
    "",
    "Responda APENAS em JSON válido no schema de programa.",
  ]
    .filter(Boolean)
    .join("\n");
}
