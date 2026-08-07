/** Helpers puros da prescrição com IA (fora do módulo de server functions). */

export type AiExercise = {
  name: string;
  sets_reps: string;
  load: string;
  rest_seconds: number | null;
  observations: string;
  /** Rótulo de agrupamento (ex.: "A1", "A2"). Vazio = exercício individual. */
  group: string;
  group_type: "individual" | "biset" | "triset" | "superset";
};

export type AiDay = {
  name: string;
  day_label: string;
  description: string;
  exercises: AiExercise[];
};

export type AiPrescription = { days: AiDay[]; notes: string };

export const SYSTEM_PROMPT = `Você é um Personal Trainer experiente em MUSCULAÇÃO (treinamento resistido com pesos), atendendo atletas, pessoas comuns e pessoas com necessidades especiais. Este motor é exclusivo de musculação: monte divisões de treino (A/B/C/D...), com foco muscular por dia, exercícios de sala de musculação, séries, repetições, carga e descanso.
Você deve planejar a continuidade didática e metodológica da programação. Se o treinador fornecer o "CONTEXTO DA PROGRAMAÇÃO ATUAL", analise o que já foi feito (exercícios, volumes, intensidades) e gere a próxima etapa (mesociclo ou microciclo seguinte) respeitando o princípio da progressão pedagógica e sobrecarga progressiva.
PROIBIDO usar movimentos de kettlebell (swing, snatch, jerk, turkish get-up), levantamento de peso olímpico (clean, arranco, arremesso), ginásticos (muscle-up, handstand), CrossFit/MetCon (burpee, wall ball, box jump, thruster) ou qualquer condicionamento metabólico. Use apenas exercícios clássicos de sala de musculação com barra, halteres, polias, máquinas e peso corporal guiado.
Você NÃO tem acesso a nenhum banco de exercícios: escreva os nomes por extenso, em português.
Exercícios podem ser individuais ou combinados. Para combinar, use o mesmo prefixo em "group" ("A1"/"A2" = par combinado) e defina "group_type" como "biset", "triset" ou "superset". Exercício isolado: "group" vazio e "group_type" igual a "individual".
Gere a prescrição em português (Brasil). Responda APENAS com JSON válido, sem markdown, no formato:
{
  "days": [
    { "name": "Treino 1",
      "day_label": "Dia A",
      "description": "Foco muscular / observações gerais",
      "exercises": [
        { "name": "Supino reto", "sets_reps": "4x10", "load": "60kg",
          "rest_seconds": 90, "observations": "Cadência 2:1",
          "group": "", "group_type": "individual" }
      ] }
  ],
  "notes": "Observações finais do plano"
}
Regras: 4 a 8 exercícios por dia; 'load' e 'observations' podem ser vazios; 'day_label' segue o tipo de nomenclatura da rotina.`;

export type RotinaContexto = {
  titulo: string;
  metodologia: string;
  duracao_semanas: number;
  data_inicio: string | null;
  data_fim: string | null;
  nomenclatura: "numerico" | "alfabetico";
  sessoes_existentes: number;
  objetivos: string | null;
  dias_por_semana: number | null;
  escopo_label: string | null;
  resumo_anterior?: string | null;
};

export function montarUserPrompt(ctx: RotinaContexto, instrucoes: string): string {
  const exemplo =
    ctx.nomenclatura === "alfabetico" ? "Dia A, Dia B, Dia C" : "Dia 1, Dia 2, Dia 3";
  const dias = ctx.dias_por_semana && ctx.dias_por_semana > 0 ? ctx.dias_por_semana : null;
  return [
    "CONTEXTO DA ROTINA (não repita, apenas use):",
    `- Nome: ${ctx.titulo}`,
    `- Modalidade: ${ctx.metodologia}`,
    `- Duração: ${ctx.duracao_semanas} semana(s)`,
    ctx.escopo_label ? `- Escopo da prescrição: ${ctx.escopo_label}` : null,
    dias ? `- Dias de treino por semana: ${dias}` : null,
    `- Período: ${ctx.data_inicio ?? "não informado"} até ${ctx.data_fim ?? "não informado"}`,
    `- Nomenclatura dos dias: ${ctx.nomenclatura} (ex.: ${exemplo})`,
    `- Sessões já existentes: ${ctx.sessoes_existentes}`,
    ctx.resumo_anterior ? `- CONTEXTO DA PROGRAMAÇÃO ATUAL (O que já foi feito):\n${ctx.resumo_anterior}` : null,
    ctx.objetivos ? `- Objetivos: ${ctx.objetivos}` : null,
    "",
    dias
      ? `OBRIGATÓRIO: gere exatamente ${dias} dia(s) de treino distintos. Se houver um contexto anterior, evolua a estrutura didática baseada no que já foi executado, mantendo a coerência metodológica.`
      : "OBRIGATÓRIO: gere exatamente 1 dia de treino.",
    "",
    "INSTRUÇÕES DO TREINADOR:",
    instrucoes.trim().length > 0
      ? instrucoes.trim()
      : "Sem instruções adicionais: monte uma divisão equilibrada de hipertrofia adequada ao escopo acima.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function calcularDataFim(inicio: string | null, semanas: number): string | null {
  if (!inicio) return null;
  const d = new Date(`${inicio}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.max(1, semanas) * 7 - 1);
  return d.toISOString().slice(0, 10);
}

/** Detecta se a rotina usa "Dia A/B/C" ou "Dia 1/2/3" pelos títulos já gravados. */
export function detectarNomenclatura(
  titulos: (string | null)[],
): "numerico" | "alfabetico" {
  const alfabeticos = titulos.filter((t) => t && /\b(dia|treino)\s*[a-h]\b/i.test(t));
  return alfabeticos.length > 0 ? "alfabetico" : "numerico";
}

function texto(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

const GROUP_TYPES = ["individual", "biset", "triset", "superset"] as const;

function tipoDeGrupo(v: unknown, grupo: string): AiExercise["group_type"] {
  const t = texto(v).toLowerCase().replace(/[\s-]/g, "");
  const achado = GROUP_TYPES.find((g) => g === t);
  if (achado && achado !== "individual") return grupo ? achado : "individual";
  return grupo ? "biset" : "individual";
}

/** JSON.parse defensivo + normalização do formato esperado. */
export function normalizarPrescricao(bruto: string): AiPrescription {
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

  const daysRaw = Array.isArray(json?.days) ? json.days : [];
  const days: AiDay[] = daysRaw.map((d: any, i: number) => {
    const exRaw = Array.isArray(d?.exercises) ? d.exercises : [];
    return {
      name: texto(d?.name, `Treino ${i + 1}`),
      day_label: texto(d?.day_label),
      description: texto(d?.description),
      exercises: exRaw
        .map((e: any) => {
          const grupo = texto(e?.group).toUpperCase().slice(0, 4);
          return {
            name: texto(e?.name),
            sets_reps: texto(e?.sets_reps),
            load: texto(e?.load),
            rest_seconds:
              typeof e?.rest_seconds === "number" && Number.isFinite(e.rest_seconds)
                ? Math.max(0, Math.round(e.rest_seconds))
                : null,
            observations: texto(e?.observations),
            group: grupo,
            group_type: tipoDeGrupo(e?.group_type, grupo),
          };
        })
        .filter((e: AiExercise) => e.name.length > 0),
    };
  });

  if (days.length === 0) {
    throw new Error("A IA não retornou nenhum dia de treino. Refine as instruções.");
  }

  return { days, notes: texto(json?.notes) };
}

export function mensagemDeErroGateway(status: number): string {
  if (status === 429) return "Limite de uso da IA atingido, tente em instantes";
  if (status === 402) return "Créditos da IA esgotados";
  return `Falha ao gerar a prescrição (erro ${status})`;
}
