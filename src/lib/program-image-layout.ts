export type FundoImagem = "claro" | "escuro" | "transparente";

export interface ImageLayout {
  largura: number;
  altura: number;
  fundo: FundoImagem;
}

export const LAYOUT_PADRAO: ImageLayout = {
  largura: 5760,
  altura: 2160,
  fundo: "claro",
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
  _programId: string,
  _modalidade?: string | null,
): { layout: ImageLayout; origem: "padrao" } {
  // Retorna sempre o padrão durante a fase de limpeza
  return { layout: LAYOUT_PADRAO, origem: "padrao" };
}

export function salvarLayout(_programId: string, _layout: ImageLayout) {
  // No-op durante a limpeza
}

export function corDoTema(variavel: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(variavel)
    .trim();
  return v || fallback;
}
