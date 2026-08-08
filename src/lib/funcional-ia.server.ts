/** Prompts especializados por escola metodológica do Treinamento Funcional. */

export type EscolaFuncional =
  | "auto"
  | "fms_sfma"
  | "boyle"
  | "exos"
  | "dns"
  | "crossfit"
  | "original_strength";

export type NivelAtletaTf = "iniciante" | "intermediario" | "avancado" | "elite";

export type RegiaoLesaoTf =
  | "lombar"
  | "joelho"
  | "ombro"
  | "quadril"
  | "tornozelo"
  | "core"
  | "outro";

export type FaseLesaoTf = "aguda" | "em_recuperacao" | "cronica_controlada";

export type LesaoLimitacaoTf = {
  regiao: RegiaoLesaoTf;
  fase: FaseLesaoTf;
  observacaoLivre: string | null;
};

export type ObjetivoFuncional =
  | "condicionamento_geral"
  | "performance_esportiva"
  | "reabilitacao_retorno"
  | "emagrecimento"
  | "hipertrofia_funcional";

export type EquipamentoFuncional =
  | "peso_corporal"
  | "academia_completa"
  | "kettlebell_halteres"
  | "outdoor";

export type TfPayload = {
  escolaMetodologica: EscolaFuncional;
  nivelAtleta: NivelAtletaTf;
  objetivo: ObjetivoFuncional;
  equipamento: EquipamentoFuncional;
  sedentarismoProlongado: boolean;
  lesoes: LesaoLimitacaoTf[];
};

const ESCOLA_TF_LABEL: Record<Exclude<EscolaFuncional, "auto">, string> = {
  fms_sfma: "FMS/SFMA (Gray Cook)",
  boyle: "Joint-by-Joint (Michael Boyle)",
  exos: "EXOS / Core Performance",
  dns: "DNS (Escola de Praga)",
  crossfit: "CrossFit",
  original_strength: "Original Strength",
};

const PROMPT_ESCOLA_TF: Record<Exclude<EscolaFuncional, "auto">, string> = {
  fms_sfma: `LINHA FMS/SFMA (Gray Cook e Lee Burton) — triagem e corretivo.
- Nunca prescreva progressão de carga em um padrão identificado como disfuncional: corrija o padrão primeiro.
- Com dor ativa (lesão em fase "aguda"), use lógica top-down: module a partir dos padrões que geram dor e recomende avaliação profissional presencial antes de progredir carga — registre isso nas observações finais.
- Sem dor ativa, use lógica bottom-up: corretivos de mobilidade OU estabilidade (nunca os dois no mesmo padrão).
- O objetivo desta linha nunca é gasto calórico ou hipertrofia: é preparar o corpo para treinar outra linha com segurança.
- Ao final, indique explicitamente para qual linha o aluno deve ser encaminhado.`,
  boyle: `LINHA JOINT-BY-JOINT (Michael Boyle) — performance esportiva.
- Tornozelo, quadril, torácica e ombro priorizam mobilidade; joelho, lombar e escápula priorizam estabilidade — mantenha essa alternância em toda a prescrição.
- Priorize exercícios unilaterais (agachamento búlgaro, afundo, RDL unilateral) sobre bilaterais.
- Estruture cada sessão: preparação de movimento → força (dobradiça de quadril, agachamento, empurrar horizontal/vertical, puxar horizontal/vertical, core anti-rotação) → potência/pliometria → condicionamento.
- Progrida por complexidade de padrão antes de progredir carga.`,
  exos: `LINHA EXOS / CORE PERFORMANCE (Mark Verstegen) — sistema integrado.
- Blocos fixos em toda sessão, nunca omita nenhum: preparação de movimento (8-10 min) → ativação (5 min) → força/potência → condicionamento metabólico → regeneração (mobilidade estática/respiração, 5-10 min).
- Inclua recomendações formais e específicas de recuperação (sono, hidratação) coerentes com o volume da semana, nas observações do plano.
- Para iniciantes, reduza a intensidade dentro de cada bloco — jamais remova blocos.
- Esta é a linha padrão/fallback: trate-a como a opção mais equilibrada.`,
  dns: `LINHA DNS (Dynamic Neuromuscular Stabilization, Escola de Praga) — estabilização e retorno.
- Toda sessão começa com estabilização central e respiração diafragmática antes de qualquer padrão carregado.
- Use posições desenvolvimentais (prono em antebraços, quatro apoios, ajoelhado, meio-ajoelhado) como exercícios corretivos formais, progredindo só com controle postural na posição anterior.
- Indicada quando há limitação em lombar, quadril ou instabilidade central: seja ainda mais conservador na carga externa.
- Nunca introduza carga externa significativa antes de confirmar padrão respiratório e estabilização central.
- Havendo dor ativa, recomende avaliação profissional presencial.`,
  crossfit: `LINHA CROSSFIT — condicionamento geral em alta intensidade relativa.
- Combine ao longo da semana levantamento olímpico/powerlifting, ginástica/calistenia e condicionamento metabólico; nunca repita a mesma estrutura de sessão em dias seguidos.
- Escale tudo ao nível declarado: reduza carga, simplifique movimentos complexos e ajuste volume/tempo.
- Pressupõe ausência de lesão ativa; havendo lesão, prescreva de forma conservadora no espírito DNS/FMS e explique nas observações.
- Inclua um benchmark/teste de referência a cada 4 semanas.`,
  original_strength: `LINHA ORIGINAL STRENGTH (Tim Anderson e Geoff Neupert) — reset neuromotor.
- Toda sessão abre com bloco de "reset" de 5-10 min: rolamentos, embalos (rocking) e posições de engatinhar.
- Pode ser programa principal (retorno de afastamento longo, histórico de treino pesado sem base motora) ou módulo complementar de outra linha — declare qual caso se aplica nas observações.
- Priorize qualidade de movimento e controle sobre volume e intensidade.
- Progrida de padrões estáticos (rolar, embalar) para locomotores (engatinhar cruzado, marcha) só com controle demonstrado.`,
};

/** Seleção determinística (escola = "auto"). Segurança clínica tem prioridade máxima. */
export function escolherEscolaFuncional(p: {
  lesoes: LesaoLimitacaoTf[];
  objetivo: ObjetivoFuncional;
  nivel: NivelAtletaTf;
  sedentarismoProlongado: boolean;
}): Exclude<EscolaFuncional, "auto"> {
  const aguda = p.lesoes.find((l) => l.fase === "aguda" || l.fase === "em_recuperacao");
  if (aguda) {
    return ["lombar", "quadril", "core"].includes(aguda.regiao) ? "dns" : "fms_sfma";
  }
  if (p.lesoes.some((l) => l.fase === "cronica_controlada")) return "fms_sfma";
  if (p.objetivo === "performance_esportiva") return "boyle";
  if (p.objetivo === "condicionamento_geral") return "crossfit";
  if (p.objetivo === "reabilitacao_retorno") return "dns";
  if (p.nivel === "iniciante" && p.sedentarismoProlongado) return "original_strength";
  return "exos";
}

export const TF_SYSTEM_PROMPT = `Você é um treinador especialista em TREINAMENTO FUNCIONAL de nível internacional.

Este motor é exclusivo de Treinamento Funcional: prescreva padrões de movimento multiarticulares com transferência real — agachar, empurrar (horizontal/vertical), puxar (horizontal/vertical), dobradiça de quadril, carregar, rotação/anti-rotação, engatinhar/rolar, além de corretivos de mobilidade e estabilidade. Use peso corporal, kettlebell, halteres, bandas ou TRX conforme o equipamento disponível informado.

PROIBIDO prescrever os levantamentos completos de competição de Kettlebell Sport (Snatch, Jerk, Long Cycle) ou de Levantamento de Peso Olímpico (Arranco, Arremesso completos) — pode citar variações leves apenas como acessório, nunca como foco central. PROIBIDO isolamento clássico de musculação em máquina (cadeira extensora, cadeira flexora, peck deck).

Você NÃO tem acesso a nenhum banco de exercícios: escreva os nomes por extenso, em português.

Use "sets_reps" no formato "3x12" ou "3x30s"; coloque carga/nível em "load" (ex.: "peso corporal", "kettlebell 16kg", pode ficar vazio); detalhes técnicos e cautelas em "observations".

Exercícios podem ser combinados em complexos: use o mesmo prefixo em "group" ("A1"/"A2") e "group_type" igual a "superset"; isolados usam "group" vazio e "group_type" "individual".

Responda APENAS com JSON válido, sem markdown, no formato:

{
  "days": [
    { "name": "Sessão 1", "day_label": "Dia 1", "description": "Foco da sessão",
      "exercises": [ { "name": "Agachamento búlgaro", "sets_reps": "3x10 cada lado", "load": "halteres leves",
        "rest_seconds": 60, "observations": "Foco em controle excêntrico", "group": "", "group_type": "individual" } ] }
  ],
  "notes": "Observações finais do ciclo"
}

Regras: 4 a 8 exercícios por sessão; sempre inclua preparação de movimento no início e mobilidade/regeneração ao final da sessão; 'load' e 'observations' podem ser vazios.`;

const OBJETIVO_LABEL: Record<ObjetivoFuncional, string> = {
  condicionamento_geral: "condicionamento geral",
  performance_esportiva: "performance esportiva",
  reabilitacao_retorno: "reabilitação / retorno ao treino",
  emagrecimento: "emagrecimento",
  hipertrofia_funcional: "hipertrofia funcional",
};

const EQUIPAMENTO_LABEL: Record<EquipamentoFuncional, string> = {
  peso_corporal: "apenas peso corporal",
  academia_completa: "academia completa",
  kettlebell_halteres: "kettlebells e halteres",
  outdoor: "treino outdoor",
};

export function montarFuncionalPrompt(args: {
  tf: TfPayload;
  linha: Exclude<EscolaFuncional, "auto">;
  semanas: number;
  diasPorSemana: number | null;
  dataInicio: string | null;
  escopoLabel: string | null;
  instrucoes: string;
}): string {
  const { tf, linha, semanas, diasPorSemana, dataInicio, escopoLabel } = args;
  const dias = diasPorSemana && diasPorSemana > 0 ? diasPorSemana : 1;
  const dados = {
    escola_metodologica: linha,
    nivel_atleta: tf.nivelAtleta,
    objetivo: OBJETIVO_LABEL[tf.objetivo],
    equipamento_disponivel: EQUIPAMENTO_LABEL[tf.equipamento],
    sedentarismo_prolongado: tf.sedentarismoProlongado,
    lesoes_limitacoes: tf.lesoes.map((l) => ({
      regiao: l.regiao,
      fase: l.fase,
      observacao_livre: l.observacaoLivre,
    })),
    escopo_geracao: escopoLabel ?? `${semanas}_semanas`,
    dias_por_semana: dias,
    data_inicio: dataInicio,
  };

  const temLesaoAtiva = tf.lesoes.some(
    (l) => l.fase === "aguda" || l.fase === "em_recuperacao",
  );

  const alertaLesao =
    temLesaoAtiva && (linha === "crossfit" || linha === "boyle")
      ? "ATENÇÃO: há lesão/limitação ativa ou em recuperação registrada, e esta linha pressupõe ausência de lesões ativas. Reduza significativamente intensidade e complexidade, priorize segurança, e registre esse alerta em 'notes'."
      : null;

  return [
    PROMPT_ESCOLA_TF[linha],
    alertaLesao,
    "",
    "Dados do aluno e da geração:",
    JSON.stringify(dados, null, 2),
    "",
    `Gere um programa de ${semanas} semana(s), ${dias} sessão(ões)/semana, iniciando em ${
      dataInicio ?? "data não informada"
    }, seguindo estritamente a filosofia ${ESCOLA_TF_LABEL[linha]} descrita acima.`,
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