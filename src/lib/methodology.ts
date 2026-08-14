export type Methodology =
  | "hibrido"
  | "kettlebell_sport"
  | "kettlebell_fitness"
  | "levantamento_peso"
  | "musculacao"
  | "treinamento_funcional"
  | "corrida";

export const METHODOLOGY_LABEL: Record<Methodology, string> = {
  hibrido: "Treinamento Híbrido",
  kettlebell_sport: "Kettlebell Sport",
  kettlebell_fitness: "Kettlebell Fitness",
  levantamento_peso: "Levantamento de Peso",
  musculacao: "Musculação",
  treinamento_funcional: "Treinamento Funcional",
  corrida: "Corrida",
};

export type BlockFormat = string;

export const BLOCK_FORMAT_LABEL: Record<BlockFormat, string> = {
  mobilidade: "Bloco de Mobilidade",
  preparacao_movimento: "Preparação de Movimento",
  forca_tecnica_pct: "Força/Técnica (%1RM)",
  emom: "EMOM",
  e2mom: "E2MOM",
  amrap: "AMRAP",
  circuito: "Circuito",
  kb_timed_sets: "Kettlebell Sport (AQ/TR)",
  metcon: "MetCon",
  bodybuilding_sets: "Musculação (séries × reps)",
  finalizador: "Finalizador",
  livre: "Bloco livre",
};

/** Todos os formatos disponíveis para uso em blocos de treino. */
export const ENABLED_FORMATS: BlockFormat[] = [
  "mobilidade",
  "forca_tecnica_pct",
  "emom",
  "e2mom",
  "amrap",
  "circuito",
  "kb_timed_sets",
  "metcon",
  "bodybuilding_sets",
  "finalizador",
  "livre",
];

/** Lê o label efetivo de um formato (respeitando renomeações do coach). */
export function useFormatLabel(base: string): string {
  if (typeof window === "undefined") return BLOCK_FORMAT_LABEL[base] ?? base;
  try {
    const raw = window.localStorage.getItem("shdt.format-registry.v1");
    if (!raw) return BLOCK_FORMAT_LABEL[base] ?? base;
    const parsed = JSON.parse(raw);
    return parsed.labels?.[base] ?? BLOCK_FORMAT_LABEL[base] ?? base;
  } catch {
    return BLOCK_FORMAT_LABEL[base] ?? base;
  }
}