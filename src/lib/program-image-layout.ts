export type FundoImagem = "claro" | "escuro" | "transparente";

export interface PosicaoBloco {
  x: number; // 0-100
  y: number; // 0-100
  w: number; // 0-100 (largura relativa)
}

export interface ImageLayout {
  largura: number;
  altura: number;
  fundo: FundoImagem;
  posicoes: Record<string, PosicaoBloco>; // chave do bloco -> posição
}

export const LAYOUT_PADRAO: ImageLayout = {
  largura: 5760,
  altura: 2160,
  fundo: "claro",
  posicoes: {},
};

/** Formatos de tela disponíveis para exportação. */
export const PRESETS_LAYOUT: Record<string, { nome: string; layout: Omit<ImageLayout, "posicoes"> }> = {
  padrao: { nome: "Painel ultrawide", layout: { largura: 5760, altura: 2160, fundo: "claro" } },
  a4: { nome: "A4 paisagem", layout: { largura: 3508, altura: 2480, fundo: "claro" } },
  quadrado: { nome: "Quadrado 1:1", layout: { largura: 2160, altura: 2160, fundo: "claro" } },
  feed: { nome: "Feed 4:5", layout: { largura: 2160, altura: 2700, fundo: "claro" } },
  story: { nome: "Story 9:16", layout: { largura: 2160, altura: 3840, fundo: "claro" } },
};

/**
 * Limpa todos os layouts salvos no localStorage para reconstrução.
 */
export function resetarTodosOsLayouts() {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach(key => {
      if (key.startsWith("program-image-layout:")) {
        window.localStorage.removeItem(key);
      }
    });
    console.log("Todos os layouts de imagem foram resetados.");
  } catch (e) {
    console.error("Erro ao resetar layouts:", e);
  }
}

export function carregarLayout(
  programId: string,
  _modalidade?: string | null,
): { layout: ImageLayout; origem: "padrao" | "custom" } {
  if (typeof window === "undefined") return { layout: LAYOUT_PADRAO, origem: "padrao" };
  try {
    const salvo = window.localStorage.getItem(`program-image-layout:${programId}`);
    if (salvo) {
      return { layout: JSON.parse(salvo), origem: "custom" };
    }
  } catch (e) {
    console.error("Erro ao carregar layout:", e);
  }
  return { layout: LAYOUT_PADRAO, origem: "padrao" };
}

export function salvarLayout(programId: string, layout: ImageLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`program-image-layout:${programId}`, JSON.stringify(layout));
  } catch (e) {
    console.error("Erro ao salvar layout:", e);
  }
}

export function corDoTema(variavel: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(variavel)
    .trim();
  return v || fallback;
}
