/**
 * Contrato COMPARTILHADO de limites por formato de bloco.
 * Usado igualmente pelo construtor (pré-validação no cliente) e pela
 * Server Function de geração. Nunca divergir os dois lados.
 */

export type FormatLimit = { maxExercicios: number; maxSeries: number };

const DEFAULT_LIMIT: FormatLimit = { maxExercicios: 30, maxSeries: 30 };

const LIMITS: Record<string, FormatLimit> = {
  mobilidade: { maxExercicios: 8, maxSeries: 10 },
  preparacao_movimento: { maxExercicios: 10, maxSeries: 12 },
  forca_tecnica_pct: { maxExercicios: 8, maxSeries: 12 },
  bodybuilding_sets: { maxExercicios: 15, maxSeries: 12 },
  finalizador: { maxExercicios: 12, maxSeries: 15 },
  emom: { maxExercicios: 20, maxSeries: 60 },
  e2mom: { maxExercicios: 20, maxSeries: 60 },
  amrap: { maxExercicios: 20, maxSeries: 30 },
  kb_timed_sets: { maxExercicios: 20, maxSeries: 30 },
  circuito: { maxExercicios: 30, maxSeries: 30 },
  metcon: { maxExercicios: 30, maxSeries: 30 },
  livre: { maxExercicios: 30, maxSeries: 30 },
};

export function baseFormatId(formatId: string): string {
  if (!formatId) return "circuito";
  if (formatId.startsWith("builtin:")) return formatId.replace("builtin:", "");
  return formatId;
}

export function getFormatLimit(formatId: string): FormatLimit {
  return LIMITS[baseFormatId(formatId)] ?? DEFAULT_LIMIT;
}

export type FormatLimitViolation = {
  code: "FORMAT_LIMIT_EXCEEDED";
  formato: string;
  campo: "numeroExercicios" | "series";
  valor: number;
  maximo: number;
};

/** Pré-validação usada no cliente antes de chamar o servidor. */
export function validarLimitesDoMolde(
  blocos: Array<{ formato: string; numeroExercicios: number; seriesMax?: number | null }>,
): FormatLimitViolation[] {
  const out: FormatLimitViolation[] = [];
  for (const b of blocos) {
    const limite = getFormatLimit(b.formato);
    if (b.numeroExercicios > limite.maxExercicios) {
      out.push({
        code: "FORMAT_LIMIT_EXCEEDED",
        formato: b.formato,
        campo: "numeroExercicios",
        valor: b.numeroExercicios,
        maximo: limite.maxExercicios,
      });
    }
    if (b.seriesMax != null && b.seriesMax > limite.maxSeries) {
      out.push({
        code: "FORMAT_LIMIT_EXCEEDED",
        formato: b.formato,
        campo: "series",
        valor: b.seriesMax,
        maximo: limite.maxSeries,
      });
    }
  }
  return out;
}
