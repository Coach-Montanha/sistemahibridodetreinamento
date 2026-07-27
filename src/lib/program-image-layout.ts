// Configuração de layout da imagem de treino: grade de 12 colunas + densidade.

export type FundoImagem = "claro" | "escuro" | "transparente";

export interface ImageLayout {
  largura: number;
  altura: number;
  margemX: number;
  margemTopo: number;
  margemBase: number;
  /** Colunas (de 12) reservadas à faixa esquerda (preparação/aquecimento). 0 = sem faixa. */
  esquerdaSpan: number;
  /** Colunas do grid principal. 0 = automático conforme a quantidade de blocos. */
  colunasPrincipal: number;
  gap: number;
  escalaTexto: number;
  fundo: FundoImagem;
}

export const LAYOUT_PADRAO: ImageLayout = {
  largura: 5760,
  altura: 2160,
  margemX: 120,
  margemTopo: 30,
  margemBase: 260,
  esquerdaSpan: 4,
  colunasPrincipal: 0,
  gap: 96,
  escalaTexto: 1,
  fundo: "claro",
};

export const PRESETS_LAYOUT: Record<
  string,
  { nome: string; descricao: string; layout: ImageLayout }
> = {
  padrao: {
    nome: "Padrão 16:9",
    descricao: "5760×2160 — faixa esquerda + grade principal",
    layout: LAYOUT_PADRAO,
  },
  compacto: {
    nome: "Compacto",
    descricao: "Faixa estreita, texto menor, mais blocos por linha",
    layout: {
      ...LAYOUT_PADRAO,
      esquerdaSpan: 3,
      colunasPrincipal: 3,
      gap: 72,
      escalaTexto: 0.88,
    },
  },
  cartaz: {
    nome: "Cartaz 4:5",
    descricao: "2160×2700 — vertical para stories e feed",
    layout: {
      ...LAYOUT_PADRAO,
      largura: 2160,
      altura: 2700,
      margemX: 96,
      margemBase: 300,
      esquerdaSpan: 0,
      colunasPrincipal: 1,
      gap: 64,
      escalaTexto: 0.62,
    },
  },
  a4: {
    nome: "A4 paisagem",
    descricao: "3508×2480 — pronto para impressão em PDF",
    layout: {
      ...LAYOUT_PADRAO,
      largura: 3508,
      altura: 2480,
      margemX: 140,
      margemBase: 240,
      esquerdaSpan: 4,
      colunasPrincipal: 2,
      gap: 80,
      escalaTexto: 0.66,
    },
  },
};

const KEY = (programId: string) => `program-image-layout:${programId}`;

export function carregarLayout(programId: string): ImageLayout {
  if (typeof window === "undefined") return LAYOUT_PADRAO;
  try {
    const raw = window.localStorage.getItem(KEY(programId));
    if (!raw) return LAYOUT_PADRAO;
    return { ...LAYOUT_PADRAO, ...(JSON.parse(raw) as Partial<ImageLayout>) };
  } catch {
    return LAYOUT_PADRAO;
  }
}

export function salvarLayout(programId: string, layout: ImageLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(programId), JSON.stringify(layout));
  } catch {
    /* storage indisponível — layout segue apenas em memória */
  }
}

/** Lê uma cor resolvida do tema atual (oklch/hsl) para uso no canvas. */
export function corDoTema(variavel: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(variavel)
    .trim();
  return v || fallback;
}