/** Helpers puros da prescrição com IA (fora do módulo de server functions). */

export type AiExercise = {
  name: string;
  sets_reps: string;
  load: string;
  rest_seconds: number | null;
  observations: string;
};

export type AiDay = {
  name: string;
  day_label: string;
  description: string;
  exercises: AiExercise[];
};

export type AiPrescription = { days: AiDay[]; notes: string };

export const SYSTEM_PROMPT = `Você é um Personal Trainer experiente em treinamento de atletas, pessoas comuns e pessoas com necessidades especiais. Gere uma prescrição de treino em português (Brasil). Responda APENAS com JSON válido, sem markdown, no formato:
{
  "days": [
    { "name": "Treino 1",
      "day_label": "Dia A",
      "description": "Foco muscular / observações gerais",
      "exercises": [
        { "name": "Supino reto", "sets_reps": "4x10", "load": "60kg",
          "rest_seconds": 90, "observations": "Cadência 2:1" }
      ] }
  ],
  "notes": "Observações finais do plano"
}
Regras: 4 a 8 exercícios por dia; 'load' e 'observations' podem ser vazios; 'day_label' segue o tipo de nomenclatura da rotina.`;

export type RotinaContexto = {
  titulo: string;
  modalidade: string;
  duracao_semanas: number;
  data_inicio: string | null;
  data_fim: string | null;
  nomenclatura: "numerico" | "alfabetico";
  sessoes_existentes: number;
  objetivos: string | null;
};

export function montarUserPrompt(ctx: RotinaContexto, instrucoes: string): string {
  const exemplo =
    ctx.nomenclatura === "alfabetico" ? "Dia A, Dia B, Dia C" : "Dia 1, Dia 2, Dia 3";
  return [
    "CONTEXTO DA ROTINA (não repita, apenas use):",
    `- Nome: ${ctx.titulo}`,
    `- Modalidade: ${ctx.modalidade}`,
    `- Duração: ${ctx.duracao_semanas} semana(s)`,
    `- Período: ${ctx.data_inicio ?? "não informado"} até ${ctx.data_fim ?? "não informado"}`,
    `- Nomenclatura dos dias: ${ctx.nomenclatura} (ex.: ${exemplo})`,
    `- Sessões já existentes: ${ctx.sessoes_existentes}`,
    ctx.objetivos ? `- Objetivos: ${ctx.objetivos}` : null,
    "",
    "INSTRUÇÕES DO TREINADOR:",
    instrucoes.trim(),
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
        .map((e: any) => ({
          name: texto(e?.name),
          sets_reps: texto(e?.sets_reps),
          load: texto(e?.load),
          rest_seconds:
            typeof e?.rest_seconds === "number" && Number.isFinite(e.rest_seconds)
              ? Math.max(0, Math.round(e.rest_seconds))
              : null,
          observations: texto(e?.observations),
        }))
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
