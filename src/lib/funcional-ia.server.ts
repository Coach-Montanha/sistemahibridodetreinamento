/** Prompts especializados por linha metodológica do Treinamento Funcional. */

export type EscolaFuncional =
  | "auto"
  | "fms_sfma"
  | "boyle"
  | "exos"
  | "dns"
  | "crossfit"
  | "original_strength";

export type NivelAtletaTf = "iniciante" | "intermediario" | "avancado" | "elite";

export type ObjetivoFuncional =
  | "condicionamento_geral"
  | "performance_esportiva"
  | "reabilitacao_retorno"
  | "emagrecimento"
  | "hipertrofia_funcional";

export type RegiaoLesao =
  | "lombar"
  | "joelho"
  | "ombro"
  | "quadril"
  | "tornozelo"
  | "core"
  | "outro";

export type FaseLesao = "aguda" | "em_recuperacao" | "cronica_controlada";

export type LesaoLimitacao = {
  regiao: RegiaoLesao;
  fase: FaseLesao;
  observacaoLivre: string | null;
};

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
  lesoes: LesaoLimitacao[];
};

export const ESCOLA_TF_LABEL: Record<Exclude<EscolaFuncional, "auto">, string> = {
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
  lesoes: LesaoLimitacao[];
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

export const TF_SYSTEM_PROMPT = `Você é um preparador físico especialista em TREINAMENTO FUNCIONAL, atuando dentro de uma linha metodológica específica informada no pedido.
Este motor é exclusivo de treinamento funcional: prescreva padrões de movimento com transferência para a vida real ou para o esporte do praticante (agachar, dobradiça de quadril, empurrar, puxar, girar, carregar, locomover, saltar), corretivos, mobilidade, estabilidade, potência e condicionamento.
SEGURANÇA CLÍNICA TEM PRIORIDADE MÁXIMA: respeite integralmente as lesões e limitações informadas, evite qualquer padrão que agrave a região afetada e registre alertas explícitos nas observações.
Respeite o equipamento disponível informado — não prescreva o que o aluno não tem.
Você NÃO tem acesso a nenhum banco de exercícios: escreva os nomes por extenso, em português.
Exercícios podem ser combinados em circuitos ou pares: use o mesmo prefixo em "group" ("A1"/"A2") e "group_type" igual a "superset"; isolados usam "group" vazio e "group_type" "individual".
Responda APENAS com JSON válido, sem markdown, no formato:
{
  "days": [
    { "name": "Sessão 1", "day_label": "Dia 1", "description": "Foco da sessão",
      "exercises": [ { "name": "Agachamento búlgaro", "sets_reps": "3x8 cada lado", "load": "halteres 12kg",
        "rest_seconds": 60, "observations": "Controle do joelho", "group": "", "group_type": "individual" } ] }
  ],
  "notes": "Observações finais, recomendações de recuperação e próxima reavaliação"
}
Regras: 5 a 9 exercícios por sessão, cobrindo preparação, bloco principal e finalização; 'load' e 'observations' podem ser vazios.`;

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
    linha_metodologica: linha,
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

  return [
    `LINHA METODOLÓGICA APLICADA: ${ESCOLA_TF_LABEL[linha]}`,
    PROMPT_ESCOLA_TF[linha],
    "",
    "DADOS DO ALUNO (JSON):",
    JSON.stringify(dados, null, 2),
    "",
    `OBRIGATÓRIO: gere exatamente ${dias} sessão(ões) distintas, formando a divisão semanal a ser repetida ao longo das ${semanas} semana(s).`,
    tf.lesoes.length > 0
      ? "OBRIGATÓRIO: adapte cada exercício às lesões/limitações listadas e explique a adaptação nas observações."
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
